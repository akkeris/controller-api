"use strict";

const assert = require('assert')
const fs = require('fs')
const http_help = require('./http_helper.js')
const config = require('./config.js')
const query = require('./query.js');
const url = require('url')
const uuid = require('uuid')
const crypto = require('crypto')
const nouns = require('./nouns.js')
const events = require('events')
const alamo = require('./alamo.js')
const elasticsearch = require('elasticsearch');

let client = process.env.ES_URL ? new elasticsearch.Client({
  hosts: [
    process.env.ES_URL
  ]
}) : null;

class ApplicationLifecycle extends events {}

function encrypt_token(key, token) {
  let cipher = crypto.createCipheriv('aes192', key);
  let enc_token = cipher.update(Buffer.from(token, 'utf8'));
  enc_token = Buffer.concat([enc_token, cipher.final()]);
  return enc_token.toString('base64');
}

function decrypt_token(key, enc_token) {
  let deciph = crypto.createDecipheriv('aes192', key);
  let token = deciph.update(Buffer.from(enc_token, 'base64'), 'utf8');
  token += deciph.final('utf8');
  return token;
}

async function determine_app_url(pg_pool, tags, app_name, space_name, org_name) {
  tags = tags || '';
  let url_templates = await alamo.url_templates(pg_pool, space_name);
  return ( tags.split(',').map((x) => x.trim().toLowerCase()).indexOf('compliance=internal') !== -1 ?
      url_templates.internal :
      url_templates.external )
  .replace(/\{space\}/g, space_name)
  .replace(/\{name\}/g, app_name)
  .replace(/\{org\}/g, org_name)
  .replace(/\-default/g, '')
}


function service_by_id_or_name(addon_id_or_name) {
  let addons_info = global.addon_services.filter((addon) => {
    if(!addon) {
      console.error("Addon did not exist:", addon);
      return false;
    }
    let details = addon.info();
    return (details.id === addon_id_or_name || details.name === addon_id_or_name);
  });
  if(addons_info.length !== 1) {
    throw new http_help.NotFoundError(`The specified addon ${addon_id_or_name} could not be found.`);
  }
  return addons_info[0];
}

function plan_by_id_or_name(plan_id_or_name) {
  let found_plans = [];
  global.addon_services.forEach((addon) => {
    let plans = addon.plans();
    plans.forEach((plan) => {
      if(plan.id === plan_id_or_name || plan.name === plan_id_or_name || plan.key === plan_id_or_name) {
        found_plans.push(plan);
      }
    });
  });
  if (found_plans.length > 1) {
    console.log("ERROR: Two services were registered that both have identical plan ids!")
    console.log(found_plans)
  }
  assert.ok(found_plans.length === 1, `The specified plan could not be found: ${plan_id_or_name} (${found_plans.length})`);
  return found_plans[0];
}

async function refresh_services(pg_pool) {
  // plugins with multiple services.
  try {
    let services = (await Promise.all([
      require('./addons/osb-addons.js')(pg_pool),
      require('./addons/vault.js')(pg_pool),
      require('./addons/alamo-rabbitmq.js')(pg_pool),
      require('./addons/alamo-mongodb.js')(pg_pool),
      require('./addons/twilio.js')(pg_pool),
      require('./addons/papertrail.js')(pg_pool),
      require('./addons/anomaly.js')(pg_pool),
      require('./addons/secure-key.js')(pg_pool),
      require('./addons/alamo-neptune.js')(pg_pool),
      require('./addons/alamo-influxdb.js')(pg_pool),
      require('./addons/alamo-cassandra.js')(pg_pool),
      require('./addons/alamo-kafka.js')(pg_pool),
    ]))
    global.addon_services = services.reduce((acc, val) => acc.concat(val), []).filter((x) => !!x);
  } catch (e) {
    console.error("Error in refreshing services:", e);
  }
}

async function init(pg_pool) {
  global.addon_services = [];
  setInterval(refresh_services.bind(refresh_services, pg_pool), 1000 * 60 * 60 * 2); // every two hours
  if (client) {
    client.indices.create({ index: 'audit'},() => {});
  }
  await refresh_services(pg_pool)
}

async function query_audits(uri) {
  const app = uri.searchParams.get('app')
  const space = uri.searchParams.get('space')
  const user = uri.searchParams.get('user')
  const size = uri.searchParams.get('size')
  if (!client) {
    throw new http_help.NotImplementedError(`The auditing feature is not enabled`)
  }
  return await client.search({
    index: 'audit',
      q: 'app.keyword:' + (app ? '"' + app + '"' : "*") + ' AND space.keyword:' + (space ? '"' + space + '"' : "*") + ' AND username:'+ (user ? '"' + user + '"' : "*"),
      sort: 'received_at:desc',
      size: size ? size : null
  })
}

function registry_image(org_name, app_name, app_uuid, build_tag, build_system) {
  if(build_system === "" || build_system === null || typeof(build_system) === "undefined") {
    console.warn("Error: The build system was not specified, defaulting to '1', however this may be incorrect!");
    build_system = "1";
  }
  return `${config.gm_registry_host}/${config.gm_registry_repo}/${app_name}-${app_uuid}:${build_system}.${build_tag}`;
}

let select_latest_release_by_app_query = query.bind(query, fs.readFileSync('./sql/select_latest_release_by_app.sql').toString('utf8'), null);
async function select_latest_release_by_app(pg_pool, app_uuid) {
  let releases = await select_latest_release_by_app_query(pg_pool, [app_uuid]);
  if(releases.length === 0 || releases[0].app !== app_uuid) {
    throw new http_help.NotFoundError(`There were no releases found for the app ${app_uuid}.`);
  }
  return releases[0];
}

let update_release_status_query = query.bind(query, fs.readFileSync('./sql/update_release_status.sql').toString('utf8'), null);
async function update_release_status(pg_pool, app_uuid, release_uuid, status) {
  await update_release_status_query(pg_pool, [app_uuid, release_uuid, status]);
}

const select_release = query.bind(query, fs.readFileSync("./sql/select_release.sql").toString('utf8'), null)
async function check_release_exists(pg_pool, app_uuid, release_id) {
  let releases = await select_release(pg_pool, [release_id])
  if(releases.length === 0 || releases[0].app_uuid !== app_uuid) {
    throw new http_help.NotFoundError(`The specified release ${release_id} was not found.`)
  }
  return releases[0]
}

let select_previews = query.bind(query, fs.readFileSync("./sql/select_previews.sql").toString('utf8'), null);
async function preview_apps(pg_pool, source_app_uuid) {
  return await select_previews(pg_pool, [source_app_uuid])
}

let select_app = query.bind(query, fs.readFileSync("./sql/select_app.sql").toString('utf8'), null)
async function check_app_exists(pg_pool, app_key) {
  let result = await select_app(pg_pool, [app_key])
  if(result.length !== 1) {
    throw new http_help.NotFoundError(`The specified application ${app_key} does not exist.`)
  }

  return result[0]
}

const select_addon = query.bind(query, fs.readFileSync('./sql/select_service.sql').toString('utf8'), (r) => { return r; });
async function check_addon_exists(pg_pool, addon_id, app_uuid) {
  let addons = await select_addon(pg_pool, [addon_id, app_uuid]);
  if(addons.length === 0) {
    throw new http_help.NotFoundError(`The specified service ${addon_id} on ${app_uuid} was not found.`)
  }
  let addon_service = service_by_id_or_name(addons[0].addon);
  let plan = plan_by_id_or_name(addons[0].plan);

  assert.ok(addon_service, "The specified addon does not exist.");
  assert.ok(plan, "The specified addon plan does not exist.");
  
  let addon_state = await addon_service.get_state(plan.id, addons[0].service, app_uuid)
  addons[0].state = addon_state.state
  addons[0].state_description = addon_state.description
  return Object.assign(addons[0], {addon_service, plan})
}

let select_org = query.bind(query,  fs.readFileSync("./sql/select_org.sql").toString('utf8'), null)
async function check_org_exists(pg_pool, org_key) {
  let result = await select_org(pg_pool, [org_key])
  if(result.length !== 1) {
    throw new http_help.NotFoundError(`The specified organization ${org_key} does not exist.`)
  }
  return result[0]
}

const select_build_query = query.bind(query, fs.readFileSync("./sql/select_build.sql").toString('utf8'), null);
async function check_build_exists(pg_pool, build_uuid) {
  let build = await select_build_query(pg_pool, [build_uuid]);
  if(!build || build.length === 0) {
    throw new http_help.NotFoundError(`The specified build ${build_uuid} was not found.`)
  }
  return build[0]
}


const select_formations = query.bind(query, fs.readFileSync("./sql/select_formations.sql").toString('utf8'), null);
async function check_formations_exists(pg_pool, app_uuid) {
  return await select_formations(pg_pool, [app_uuid]);
}

let select_space = query.bind(query, fs.readFileSync('./sql/select_space.sql').toString('utf8'), null);
async function check_space_exists(pg_pool, space_key) {
  let result = await select_space(pg_pool, [space_key])
  if(result.length !== 1) {
    throw new http_help.NotFoundError(`The specified space ${space_key} does not exist.`)
  }
  return result[0]
}

let select_site = query.bind(query, fs.readFileSync('./sql/select_site.sql').toString('utf8'), null);
async function check_site_exists(pg_pool, site_key) {
  let result = await select_site(pg_pool, [site_key])
  if(result.length !== 1) {
    throw new http_help.NotFoundError(`The specified site ${site_key} does not exist.`)
  }
  return result[0]
}

let select_region = query.bind(query, fs.readFileSync('./sql/select_region.sql').toString('utf8'), null);
async function check_region_exists(pg_pool, region_key, do_not_error) {
  let regions = await select_region(pg_pool, [region_key])
  if(regions.length !== 1) {
    if(do_not_error) {
      return null
    }
    throw new http_help.NotFoundError(`The specified region ${region_key} was not found.`)
  }
  return regions[0]
}

let select_stack = query.bind(query, fs.readFileSync('./sql/select_stack.sql').toString('utf8'), null);
async function check_stack_exists(pg_pool, stack_key, do_not_error) {
  let stacks = await select_stack(pg_pool, [stack_key])
  if(stacks.length !== 1) {
    if(do_not_error) {
      return null
    }
    throw new http_help.NotFoundError(`The specified stack ${stack_key} was not found.`)
  }
  return stacks[0]
}

let select_filter = query.bind(query, fs.readFileSync('./sql/select_filter.sql').toString('utf8'), null);
let select_attachments = query.bind(query, fs.readFileSync('./sql/select_filter_attachments.sql').toString('utf8'), null);
async function check_filter_attachments(pg_pool, app_uuid) {
  let attachments = await select_attachments(pg_pool, [app_uuid]);
  return await Promise.all(attachments.map(async (x) => {
    let filters = await select_filter(pg_pool, [x.filter])
    x.filter = filters[0]
    return x
  }))
}

async function check_deployment_filters(pg_pool, app_uuid, dyno_type) {
  if(dyno_type !== "web") {
    return []
  }
  return (await check_filter_attachments(pg_pool, app_uuid))
    .map((x) => { 
      if(x.filter.type === "jwt") {
        return {
          "type":"jwt",
          "data":{
            "audiences":x.filter.options.audiences,
            "jwks_uri":x.filter.options.jwks_uri,
            "issuer":x.filter.options.issuer,
            "excludes":(x.attachment_options.excludes || []).join(','),
          }
        }
      } else {
        throw new Error('Invalid filter type: ' + x.filter.type)
      }
    });
}

let select_features = query.bind(query, fs.readFileSync('./sql/select_features.sql').toString('utf8'), null)
async function feature_enabled(pg_pool, app_uuid, feature_key) {
  let features = await select_features(pg_pool, [app_uuid])
  let feature = features.filter((x) => x.name === feature_key)
  if(feature.length === 0) {
    return false
  } else {
    return true
  }
}

async function check_deployment_features(pg_pool, app_uuid, dyno_type) {
  if (dyno_type === 'web') {
    return {
      "serviceMesh": await feature_enabled(pg_pool, app_uuid, "service-mesh"),
      "http2": await feature_enabled(pg_pool, app_uuid, "http2"),
      "http2-end-to-end": await feature_enabled(pg_pool, app_uuid, "http2-end-to-end"),
    }
  } else {
    return {
      "serviceMesh":false,
      "http2":false,
      "http2-end-to-end":false,
    }
  }
}

let select_topic = query.bind(query, fs.readFileSync("./sql/select_topic.sql").toString('utf8'), null);
async function check_topic_exists(pg_pool, topic_key, cluster_key) {
  if (!/-/.test(cluster_key)){
    throw new http_help.NotFoundError(`Invalid cluster '${cluster_key}'. Provide cluster as a UUID or with cluster-region syntax.`);
  }

  let result = await select_topic(pg_pool, [topic_key, cluster_key]);
  if (result.length !== 1) {
    throw new http_help.NotFoundError(`The specified topic ${topic_key} does not exist in cluster ${cluster_key}.`);
  }

  return result[0];
}

let select_cluster = query.bind(query, fs.readFileSync("./sql/select_cluster.sql").toString('utf8'), null);
async function check_cluster_exists(pg_pool, cluster_key) {
  if (!/-/.test(cluster_key)){
    throw new http_help.NotFoundError(`Invalid cluster '${cluster_key}'. Provide cluster as a UUID or with cluster-region syntax.`);
  }

  let result = await select_cluster(pg_pool, [cluster_key]);
  if (result.length !== 1) {
    throw new http_help.NotFoundError(`The specified cluster ${cluster_key} does not exist.`);
  }

  return result[0];
}

// TODO: This... seems bizarre. Maybe an event model is better?
const select_hooks = query.bind(query, fs.readFileSync('./sql/select_hooks.sql').toString('utf8'), (x) => { return x; });
const insert_hook_result = query.bind(query, fs.readFileSync('./sql/insert_hook_result.sql').toString('utf8'), (x) => { return x; });
const hook_types = [
  require('./hook-types/circleci.js'),
  require('./hook-types/microsoft-teams.js'),
  require('./hook-types/opsgenie.js'),
  require('./hook-types/rollbar.js'),
  require('./hook-types/slack.js'),
  require('./hook-types/https.js') // THIS MUST BE LAST, order matters here.
].filter((x) => x.enabled());


async function notify_audits(payload, username) {
  try {
    if (client) {
      let body = Object.assign(JSON.parse(payload),{username})
      if (!body.received_at){
        let received_at = (new Date()).toISOString()
        body = Object.assign(body, {received_at})
      }
      client.index({  
        index: 'audit',
        type: 'event',
        body: {
          action: body.action,
          app: body.app.name,
          space: body.space.name,
          received_at: body.received_at,
          username: body.username,
          info: JSON.stringify(body)
        }
      });
    }
  } catch (err) {
    console.error("An error occured auditing request:", err);
  }
}

function socs(envs) {
  let blacklist_wri_regex = /([A-z0-9\-\_\.]+\:)[A-z0-9\-\_\.]+(\@tcp\([A-z0-9\-\_\.]+\:[0-9]+\)[A-z0-9\-\_\.\/]+)/;
  let blacklist_uri_regex = /([A-z]+\:\/\/[A-z0-9\-\_\.]*\:)[A-z0-9\-\_\.\*\!\&\%\^\*\(\)\=\+\`\~\,\.\<\>\?\/\\\:\;\"\'\ \t\}\{\[\]\\|\#\$}]+(\@[A-z0-9\-\_\.\:\/]+)/;
  if(!config.envs_blacklist || config.envs_blacklist === '') {
    return envs;
  }
  try {
    let blacklist = config.envs_blacklist.split(',');
    Object.keys(envs).forEach(function(env) {
      blacklist.forEach(function(blEnv) {
        if(blEnv && blEnv !== '' && env && env !== '' && env.toLowerCase().trim().indexOf(blEnv.toLowerCase().trim()) > -1) {
          envs[env] = '[redacted]';
        }
        if(envs[env] || envs[env] === '') {
          if(envs[env].startsWith('https://hooks.slack.com/services/')) {
            envs[env] = 'https://hooks.slack.com/services/[redacted]'
          }
          if(envs[env].startsWith('https://outlook.office365.com/webhook/')) {
            envs[env] = 'https://outlook.office365.com/webhook/[redacted]'
          }
          envs[env] = envs[env].replace(blacklist_uri_regex, '$1[redacted]$2')
          envs[env] = envs[env].replace(blacklist_wri_regex, '$1[redacted]$2')
          envs[env] = envs[env].replace(/\?password=([^\&]+)/g, '?password=[redacted]')
          envs[env] = envs[env].replace(/\&password=([^\&]+)/g, '&password=[redacted]')
          envs[env] = envs[env].replace(/\?pwd=([^\&]+)/g, '?pwd=[redacted]')
          envs[env] = envs[env].replace(/\&pwd=([^\&]+)/g, '&pwd=[redacted]')
          envs[env] = envs[env].replace(/\?access_token=([^\&]+)/g, '?access_token=[redacted]')
          envs[env] = envs[env].replace(/\&access_token=([^\&]+)/g, '&access_token=[redacted]')
          envs[env] = envs[env].replace(/\?accessToken=([^\&]+)/g, '?accessToken=[redacted]')
          envs[env] = envs[env].replace(/\&accessToken=([^\&]+)/g, '&accessToken=[redacted]')
          envs[env] = envs[env].replace(/\?refresh_token=([^\&]+)/g, '?refresh_token=[redacted]')
          envs[env] = envs[env].replace(/\&refresh_token=([^\&]+)/g, '&refresh_token=[redacted]')
          envs[env] = envs[env].replace(/\?refreshToken=([^\&]+)/g, '?refreshToken=[redacted]')
          envs[env] = envs[env].replace(/\&refreshToken=([^\&]+)/g, '&refreshToken=[redacted]')
          envs[env] = envs[env].replace(/\?token=([^\&]+)/g, '?token=[redacted]')
          envs[env] = envs[env].replace(/\&token=([^\&]+)/g, '&token=[redacted]')
          envs[env] = envs[env].replace(/\?client_secret=([^\&]+)/g, '?client_secret=[redacted]')
          envs[env] = envs[env].replace(/\&client_secret=([^\&]+)/g, '&client_secret=[redacted]')
          envs[env] = envs[env].replace(/\?clientSecret=([^\&]+)/g, '?clientSecret=[redacted]')
          envs[env] = envs[env].replace(/\&clientSecret=([^\&]+)/g, '&clientSecret=[redacted]')
          envs[env] = envs[env].replace(/\?circle-token=([^\&]+)/g, '?circle-token=[redacted]')
          envs[env] = envs[env].replace(/\&circle-token=([^\&]+)/g, '&circle-token=[redacted]')
        } else {
          console.warn(`The environment variable named ${env} did not have an actual value.`);
        }
      });
    });
    return envs
  } catch (e) {
    console.log('error filtering environments, returning safety response.');
    console.log(e)
    return {};
  }
}

const select_hooks_destroy = query.bind(query, fs.readFileSync('./sql/select_hooks_destroy.sql').toString('utf8'), (x) => { return x; });
async function notify_hooks(pg_pool, app_uuid, type, payload, username) {
  try {
    assert.ok(typeof(payload) === 'string', 'The specified payload was not a string!')
    notify_audits(payload, username).catch((e) => console.error(e));
    let hooks = [];
    if (type === 'destroy') {
      hooks = (await select_hooks_destroy(pg_pool, [app_uuid])).filter((x) => x.active && x.url && x.events.split(',').map((x) => x.toLowerCase().trim()).includes(type.toLowerCase()));
    } else {
      hooks = (await select_hooks(pg_pool, [app_uuid])).filter((x) => x.active && x.url && x.events.split(',').map((x) => x.toLowerCase().trim()).includes(type.toLowerCase()));
    }
    await Promise.all(hooks.map(async (hook) => {
      const id = uuid.v4();
      // calculate the hash signature
      const secret = decrypt_token(process.env.ENCRYPT_KEY, hook.secret);
      const hmac = crypto.createHmac('sha1', secret);
      const recorded_url = socs({URL:hook.url}).URL;
      try {
        let hook_type = hook_types.filter((x) => x.test(hook.url))[0];
        assert.ok(hook_type, `No valid hook was found for the url ${hook.url}`);
        let {sent_metadata, sent_data, received_code, received_metadata, received_data} = await hook_type.fire(id, hook.url, type, JSON.parse(payload), hmac.update(payload).digest('hex'));
        await insert_hook_result(pg_pool, [id, hook.hook, hook.events, recorded_url, received_code, JSON.stringify(received_metadata), received_data.toString('utf8'), JSON.stringify(sent_metadata), sent_data]);
      } catch (e) {
        console.error('Error firing webhook:', e)
        await insert_hook_result(pg_pool, [id, hook.hook, hook.events, recorded_url, 0, null, JSON.stringify(e), JSON.stringify({}), payload])
      }
    }))
  } catch (err) {
    console.error("An error occured firing a hook:", err, app_uuid, type, payload, username);
  }
}

function check_uuid(puuid) {
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(puuid) === null) {
    throw new http_help.UnprocessibleEntityError("The specified uuid was invalid.")
  }
}

module.exports = {
  socs,
  check_uuid,
  determine_app_url,
  alamo,
  service_by_id_or_name,
  plan_by_id_or_name,
  feature_enabled,
  app_exists:check_app_exists,
  addon_exists:check_addon_exists,
  build_exists:check_build_exists,
  topic_exists:check_topic_exists,
  cluster_exists:check_cluster_exists,
  space_exists:check_space_exists,
  org_exists:check_org_exists,
  site_exists:check_site_exists,
  region_exists:check_region_exists,
  stack_exists:check_stack_exists,
  release_exists:check_release_exists,
  formations_exists:check_formations_exists,
  latest_release:select_latest_release_by_app,
  filter_attachments_exists:check_filter_attachments,
  deployment_filters:check_deployment_filters,
  deployment_features:check_deployment_features,
  registry_image,
  encrypt_token,
  decrypt_token,
  notify_hooks,
  preview_apps,
  update_release_status,
  services: () => global.addon_services,
  random_name: () => nouns[Math.floor(nouns.length * Math.random())],
  HttpError:http_help.HttpError,
  InternalServerError:http_help.InternalServerError,
  BadRequestError:http_help.BadRequestError,
  ServiceUnavailableError:http_help.ServiceUnavailableError,
  UnprocessibleEntityError:http_help.UnprocessibleEntityError,
  NotAllowedError:http_help.NotAllowedError,
  ConflictError:http_help.ConflictError,
  NoFormationsFoundError:http_help.NoFormationsFoundError,
  NotFoundError:http_help.NotFoundError,
  WaitingForResourcesError:http_help.WaitingForResourcesError,
  UnauthorizedError:http_help.UnauthorizedError,
  NotImplementedError: http_help.NotImplementedError,
  lifecycle:(new ApplicationLifecycle()),
  init,
  query_audits,
};
