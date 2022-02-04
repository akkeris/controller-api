const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const crypto = require('crypto');
const events = require('events');
const elasticsearch = require('elasticsearch');
const jose = require('node-jose');
const alamo = require('./alamo.js');
const nouns = require('./nouns.js');
const query = require('./query.js');
const config = require('./config.js');
const httph = require('./http_helper.js');


const client = process.env.ES_URL ? new elasticsearch.Client({
  hosts: [
    process.env.ES_URL,
  ],
}) : null;

class ApplicationLifecycle extends events {}

const IV_LENGTH = 16;


function x5c_from_pem(pem) {
  return pem.split('\n').filter((x) => x !== '' && !x.startsWith('---')).join('');
}

function sign_to_token(signature) {
  return `${signature.signatures[0].protected
  }.${signature.payload
  }.${signature.signatures[0].signature}`;
}

function verify_to_token(verify) {
  return `${jose.util.base64url.encode(Buffer.from(JSON.stringify(verify.header)))
  }.${jose.util.base64url.encode(verify.payload)
  }.${jose.util.base64url.encode(verify.signature)}`;
}

async function jwks_sign(pem, data) {
  assert.ok(pem, 'The private key JWT_PRIVATE_KEY was not found.');
  if (Buffer.isBuffer(pem)) {
    pem = pem.toString('utf8');
  }
  pem = pem.trim();
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return jose.JWS.createSign({ alg: 'RS256' }, await jose.JWK.asKey(pem, 'pem')).update(data).final();
}

async function log_event(pg_pool, app, space, data) {
  if (!app || !space || app === '' || space === '') {
    console.error(`ERROR: Unable to direct log-drain event, app ${app} or space ${space} was blank!`);
    return;
  }
  if (Buffer.isBuffer(data)) {
    data = data.toString('utf8');
  }
  if (typeof data !== 'string') {
    data = data.toString();
  }
  try {
    await alamo.drains.event(pg_pool, space, app, data);
  } catch (err) {
    console.warn('Unable to submit custom log message:', err);
  }
}

async function jwks_verify(pem, intended_issuer, intended_audience, data, signature) {
  assert.ok(pem, 'The private key JWT_PUBLIC_CERT was not found.');
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  if (Buffer.isBuffer(pem)) {
    pem = pem.toString('utf8');
  }
  pem = pem.trim();
  const cert = await jose.JWK.asKey(pem, 'pem');
  const full_signature = {
    payload: jose.util.base64url.encode(Buffer.from(data)),
    signatures: [
      {
        protected: jose.util.base64url.encode(JSON.stringify({ alg: 'RS256', kid: cert.kid })),
        signature,
      },
    ],
  };
  let payload = await jose.JWS.createVerify(cert).verify(full_signature);
  payload = JSON.parse(payload.payload.toString('utf8'));

  // check standard JWT token parameters
  assert.ok(
    (payload.iss && intended_issuer && payload.iss === intended_issuer) || !intended_issuer || !payload.iss,
    'Unauthorized: issuer is invalid',
  );
  assert.ok(payload.exp && payload.exp > Math.floor((new Date()).getTime() / 1000), 'Unauthorized: token is expired, or has no "exp" field.');
  assert.ok(
    (payload.aud && intended_audience && payload.aud === intended_audience) || !intended_audience || !payload.aud,
    'Unauthorized: audience is invalid',
  );
  assert.ok(
    (payload.nbf && payload.nbf < Math.floor((new Date()).getTime()) / 1000) || !payload.nbf,
    'Unauthorized: token cannot be used yet, now < "nbf" field.',
  );
  return payload;
}

async function http_jwks_uri(jwt_public_cert, pg_pool, req, res) {
  const pems = jwt_public_cert;
  assert.ok(pems, 'The private key JWT_RS256_PUBLIC_CERT was not found.');
  const result = {
    keys: await Promise.all(
      pems.split('-----END PUBLIC KEY-----\n')
        .filter((x) => x && x !== null && x !== '')
        .map((x) => `${x}-----END PUBLIC KEY-----\n`)
        .map(async (pem) => {
          try {
            const jwk = await jose.JWK.asKey(pem, 'pem');
            return {
              use: 'sig', x5c: [x5c_from_pem(pem)], alg: 'RS256', ...jwk.toJSON(),
            };
          } catch (e) {
            console.error(e);
            return null;
          }
        }),
    ),
  };
  httph.ok_response(res, JSON.stringify(result));
}

const TTL_TEMP_TOKEN = Number.isInteger(Number.parseInt(process.env.TTL_TEMP_TOKEN, 10))
  ? Number.parseInt(process.env.TTL_TEMP_TOKEN, 10) : 60/* sec */ * 60/* min */;

async function create_temp_jwt_token(pem, username, audience, issuer, elevated_access, metadata = {}) {
  if (!pem || pem === '' || pem.length === 0 || (typeof pem === 'string' && pem.trim() === '')) {
    return null;
  }
  const payload = {
    ...metadata, // additional data that is added to the claim.
    // put at beginning so below properties override anything in it.
    sub: username, // who made the request. (https://tools.ietf.org/html/rfc7519#section-4.1.2)
    ele: elevated_access, // do they have elevated access.
    aud: audience, // who this token is intended for. (https://tools.ietf.org/html/rfc7519#section-4.1.3)
    iss: issuer, // who issued this token. (https://tools.ietf.org/html/rfc7519#section-4.1.1)
    exp: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN + 60, // expiration date (https://tools.ietf.org/html/rfc7519#section-4.1.4) - allow 1 minute of drift.
    nbf: Math.floor((new Date()).getTime() / 1000) - 60, // token is not valid before (https://tools.ietf.org/html/rfc7519#section-4.1.5) - allow 1 minute of drift.
    jti: Math.round(Math.random() * (Number.MAX_VALUE - 1)), // Random unique identifier for this temp token. (https://tools.ietf.org/html/rfc7519#section-4.1.7)
  };
  return sign_to_token(await jwks_sign(pem, payload));
}


function encrypt_token(key, token) {
  assert.ok(key.length === 24, 'Key must be 24 characters (192 bits)');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes192', key, iv);
  let enc_token = cipher.update(Buffer.from(token, 'utf8'));
  enc_token = Buffer.concat([enc_token, cipher.final()]);
  return `salted:${iv.toString('base64')}:${enc_token.toString('base64')}`;
}

function decrypt_token(key, enc_token) {
  assert.ok(key.length === 24, 'Key must be 24 characters (192 bits)');
  assert.ok(enc_token.startsWith('salted:'), 'Encrypted token needs an IV');

  const tokenParts = enc_token.replace('salted:', '').split(':');
  const iv = Buffer.from(tokenParts.shift(), 'base64');
  const encryptedToken = Buffer.from(tokenParts.join(':'), 'base64');
  const decipher = crypto.createDecipheriv('aes192', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedToken);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function determine_app_url(pg_pool, tags, app_name, space_name, org_name) {
  tags = tags || '';
  const url_templates = await alamo.url_templates(pg_pool, space_name);
  return (tags.split(',').map((x) => x.trim().toLowerCase()).indexOf('compliance=internal') !== -1
    ? url_templates.internal
    : url_templates.external)
    .replace(/\{space\}/g, space_name)
    .replace(/\{name\}/g, app_name)
    .replace(/\{org\}/g, org_name)
    .replace(/-default/g, '');
}


function service_by_id_or_name(addon_id_or_name) {
  const addons_info = global.addon_services.filter((addon) => {
    if (!addon) {
      console.error('Addon did not exist:', addon);
      return false;
    }
    const details = addon.info();
    return (details.id === addon_id_or_name || details.name === addon_id_or_name);
  });
  if (addons_info.length !== 1) {
    throw new httph.NotFoundError(`The specified addon ${addon_id_or_name} could not be found.`);
  }
  return addons_info[0];
}

function plan_by_id_or_name(plan_id_or_name) {
  const found_plans = [];
  global.addon_services.forEach((addon) => {
    const plans = addon.plans();
    plans.forEach((plan) => {
      if (plan.id === plan_id_or_name || plan.name === plan_id_or_name || plan.key === plan_id_or_name) {
        found_plans.push(plan);
      }
    });
  });
  if (found_plans.length > 1) {
    console.log('ERROR: Two services were registered that both have identical plan ids!');
    console.log(found_plans);
  }
  assert.ok(found_plans.length === 1, `The specified plan could not be found: ${plan_id_or_name} (${found_plans.length})`);
  return found_plans[0];
}

async function refresh_domains(pg_pool) {
  global.domains = (await alamo.sites.get_domains(pg_pool))
    .map((domain) => domain.name)
    .filter((v, i, s) => s.indexOf(v) === i);
}

async function refresh_services(pg_pool) {
  // plugins with multiple services.
  try {
    const services = (await Promise.all([
      require('./addons/osb-addons.js')(pg_pool),
      require('./addons/vault.js')(pg_pool),
      require('./addons/alamo-rabbitmq.js')(pg_pool),
      require('./addons/alamo-mongodb.js')(pg_pool),
      require('./addons/twilio.js')(pg_pool),
      require('./addons/papertrail.js')(pg_pool),
      require('./addons/anomaly.js')(pg_pool),
      require('./addons/secure-key.js')(pg_pool),
      require('./addons/alamo-influxdb.js')(pg_pool),
      require('./addons/alamo-kafka.js')(pg_pool),
    ]));
    global.addon_services = services.reduce((acc, val) => acc.concat(val), []).filter((x) => !!x);
  } catch (e) {
    console.error('Error in refreshing services:', e);
  }
}

async function init(pg_pool) {
  global.addon_services = [];
  global.domains = [];
  setInterval(refresh_services.bind(refresh_services, pg_pool), 1000 * 60 * 60 * 2); // every two hours
  setInterval(refresh_domains.bind(refresh_domains, pg_pool), 1000 * 60 * 60 * 2); // every two hours
  if (client) {
    client.indices.create({ index: 'audit' }, () => {});
  }
  await refresh_services(pg_pool);
  await refresh_domains(pg_pool);
}

async function query_audits(uri) {
  const app = uri.searchParams.get('app');
  const space = uri.searchParams.get('space');
  const user = uri.searchParams.get('user');
  const size = uri.searchParams.get('size');
  if (!client) {
    throw new httph.NotImplementedError('The auditing feature is not enabled');
  }
  return client.search({
    index: 'audit',
    q: `app.keyword:${app ? `"${app}"` : '*'} AND space.keyword:${space ? `"${space}"` : '*'} AND username:${user ? `"${user}"` : '*'}`,
    sort: 'received_at:desc',
    size: size || null,
  });
}

function registry_image(org_name, app_name, app_uuid, build_tag, build_system) {
  if (build_system === '' || build_system === null || typeof (build_system) === 'undefined') {
    console.warn("Error: The build system was not specified, defaulting to '1', however this may be incorrect!");
    build_system = '1';
  }
  return `${config.gm_registry_host}/${config.gm_registry_repo}/${app_name}-${app_uuid}:${build_system}.${build_tag}`;
}

const select_latest_release_by_app_query = query.bind(query, fs.readFileSync('./sql/select_latest_release_by_app.sql').toString('utf8'), null);
async function select_latest_release_by_app(pg_pool, app_uuid) {
  const releases = await select_latest_release_by_app_query(pg_pool, [app_uuid]);
  if (releases.length === 0 || releases[0].app !== app_uuid) {
    throw new httph.NotFoundError(`There were no releases found for the app ${app_uuid}.`);
  }
  return releases[0];
}

const update_release_status_query = query.bind(query, fs.readFileSync('./sql/update_release_status.sql').toString('utf8'), null);
async function update_release_status(pg_pool, app_uuid, release_uuid, status) {
  await update_release_status_query(pg_pool, [app_uuid, release_uuid, status]);
}

const update_action_run_status_query = query.bind(query, fs.readFileSync('./sql/update_action_run_status.sql').toString('utf8'), null);
async function update_action_run_status(pg_pool, action_uuid, run_uuid, status, exit_code, started_at, finished_at) {
  await update_action_run_status_query(pg_pool, [action_uuid, run_uuid, status, exit_code, started_at, finished_at]);
}

const select_release = query.bind(query, fs.readFileSync('./sql/select_release.sql').toString('utf8'), null);
async function check_release_exists(pg_pool, app_uuid, release_id) {
  const releases = await select_release(pg_pool, [release_id]);
  if (releases.length === 0 || releases[0].app_uuid !== app_uuid) {
    throw new httph.NotFoundError(`The specified release ${release_id} was not found.`);
  }
  return releases[0];
}

const select_previews = query.bind(query, fs.readFileSync('./sql/select_previews.sql').toString('utf8'), null);
async function preview_apps(pg_pool, source_app_uuid) {
  return select_previews(pg_pool, [source_app_uuid]);
}

const select_app = query.bind(query, fs.readFileSync('./sql/select_app.sql').toString('utf8'), null);
async function check_app_exists(pg_pool, app_key) {
  const result = await select_app(pg_pool, [app_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified application ${app_key} does not exist.`);
  }

  return result[0];
}

const select_action = query.bind(query, fs.readFileSync('./sql/select_action.sql').toString('utf8'), null);
async function check_action_exists(pg_pool, app_uuid, action_key) {
  const result = await select_action(pg_pool, [app_uuid, action_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified action ${action_key} does not exist.`);
  }
  return result[0];
}

const select_action_run  = query.bind(query, fs.readFileSync('./sql/select_action_run.sql').toString('utf8'), null);
async function check_action_run_exists(pg_pool, action_key, run_key) {
  const result = await select_action_run(pg_pool, [action_key, run_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified action run ${run_key} does not exist.`);
  }
  return result[0];
}

const select_addon = query.bind(query, fs.readFileSync('./sql/select_service.sql').toString('utf8'), (r) => r);
async function check_addon_exists(pg_pool, addon_id, app_uuid) {
  const addons = await select_addon(pg_pool, [addon_id, app_uuid]);
  if (addons.length === 0) {
    throw new httph.NotFoundError(`The specified service ${addon_id} on ${app_uuid} was not found.`);
  }
  const addon_service = service_by_id_or_name(addons[0].addon);
  const plan = plan_by_id_or_name(addons[0].plan);

  assert.ok(addon_service, 'The specified addon does not exist.');
  assert.ok(plan, 'The specified addon plan does not exist.');

  const addon_state = await addon_service.get_state(plan.id, addons[0].service, app_uuid);
  addons[0].state = addon_state.state;
  addons[0].state_description = addon_state.description;
  return Object.assign(addons[0], { addon_service, plan });
}

const select_org = query.bind(query, fs.readFileSync('./sql/select_org.sql').toString('utf8'), null);
async function check_org_exists(pg_pool, org_key) {
  const result = await select_org(pg_pool, [org_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified organization ${org_key} does not exist.`);
  }
  return result[0];
}

const select_build_query = query.bind(query, fs.readFileSync('./sql/select_build.sql').toString('utf8'), null);
async function check_build_exists(pg_pool, build_uuid, pull_slug = false) {
  const build = await select_build_query(pg_pool, [build_uuid, pull_slug]);
  if (!build || build.length === 0) {
    throw new httph.NotFoundError(`The specified build ${build_uuid} was not found.`);
  }
  return build[0];
}


const select_formations = query.bind(query, fs.readFileSync('./sql/select_formations.sql').toString('utf8'), null);
async function check_formations_exists(pg_pool, app_uuid) {
  return select_formations(pg_pool, [app_uuid]);
}

const select_space = query.bind(query, fs.readFileSync('./sql/select_space.sql').toString('utf8'), null);
async function check_space_exists(pg_pool, space_key) {
  const result = await select_space(pg_pool, [space_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified space ${space_key} does not exist.`);
  }
  return result[0];
}

const select_site = query.bind(query, fs.readFileSync('./sql/select_site.sql').toString('utf8'), null);
async function check_site_exists(pg_pool, site_key) {
  const result = await select_site(pg_pool, [site_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified site ${site_key} does not exist.`);
  }
  return result[0];
}

const select_region = query.bind(query, fs.readFileSync('./sql/select_region.sql').toString('utf8'), null);
async function check_region_exists(pg_pool, region_key, do_not_error) {
  const regions = await select_region(pg_pool, [region_key]);
  if (regions.length !== 1) {
    if (do_not_error) {
      return null;
    }
    throw new httph.NotFoundError(`The specified region ${region_key} was not found.`);
  }
  return regions[0];
}

const select_stack = query.bind(query, fs.readFileSync('./sql/select_stack.sql').toString('utf8'), null);
async function check_stack_exists(pg_pool, stack_key, do_not_error) {
  const stacks = await select_stack(pg_pool, [stack_key]);
  if (stacks.length !== 1) {
    if (do_not_error) {
      return null;
    }
    throw new httph.NotFoundError(`The specified stack ${stack_key} was not found.`);
  }
  return stacks[0];
}

const select_filter = query.bind(query, fs.readFileSync('./sql/select_filter.sql').toString('utf8'), null);
const select_attachments = query.bind(query, fs.readFileSync('./sql/select_filter_attachments.sql').toString('utf8'), null);
async function check_filter_attachments(pg_pool, app_uuid) {
  const attachments = await select_attachments(pg_pool, [app_uuid]);
  return Promise.all(attachments.map(async (x) => {
    const filters = await select_filter(pg_pool, [x.filter]);
    [x.filter] = filters;
    return x;
  }));
}

async function check_deployment_filters(pg_pool, app_uuid, dyno_type, features) {
  if (dyno_type !== 'web') {
    return [];
  }
  let filters = (await check_filter_attachments(pg_pool, app_uuid))
    .map((x) => {
      if (x.filter.type === 'jwt') {
        return {
          type: 'jwt',
          data: {
            audiences: x.filter.options.audiences,
            jwks_uri: x.filter.options.jwks_uri,
            issuer: x.filter.options.issuer,
            excludes: (x.attachment_options.excludes || []).join(','),
            includes: (x.attachment_options.includes || []).join(','),
          },
        };
      } else if (x.filter.type === 'cors') {
        return {
          type: 'cors',
          data: {
            allow_origin: (x.filter.options.allow_origin || []).join(','),
            allow_methods: (x.filter.options.allow_methods || []).map((y) => y.toUpperCase()).join(','),
            allow_headers: (x.filter.options.allow_headers || []).join(','),
            expose_headers: (x.filter.options.expose_headers || []).join(','),
            max_age: (typeof x.filter.options.max_age === 'number') ? x.filter.options.max_age.toString() : x.filter.options.max_age,
            allow_credentials: x.filter.options.allow_credentials === true ? 'true' : 'false',
          },
        };
      } else if (x.filter.type === 'csp') {
        return {
          type: 'csp',
          data: {
            policy: x.filter.options.policy,
          },
        }
      }
      throw new Error(`Invalid filter type: ${x.filter.type}`);
    });

  if(!filters.some((x) => x.type === 'csp')) {
    // Generate a new CSP filter based on four features.
    const ignore_domains = config.csp_ignore_domains ?  config.csp_ignore_domains.split(',').map((x) => x.trim().toLowerCase()) : [];
    const allowed_domains = `${["'self'"].concat(global.domains.filter((x) => !ignore_domains.includes(x)).map((x) => `*.${x}`)).join(' ')}`;
    let policy = '';
    if(features['csp-javascript']) {
      policy += ` connect-src ${allowed_domains}; script-src ${allowed_domains};`;
    }
    if(features['csp-media']) {
      policy += ` font-src ${allowed_domains}; img-src ${allowed_domains}; media-src ${allowed_domains}; style-src ${allowed_domains};`;
    }
    if(features['csp-unsafe']) {
      policy += ` base-uri ${allowed_domains};`;
    }
    if(features['csp-embedded']) {
      policy += ` object-src ${allowed_domains}; frame-src ${allowed_domains};`;
    }
    if(policy !== "") {
      if(config.csp_report_uri) {
        policy += ` report-uri ${config.csp_report_uri};`;
      }
      filters.push({
        type: 'csp',
        data: {
          policy: 'default-src https:;' + policy,
        },
      });
    }
  }

  return filters;
}

const select_features = query.bind(query, fs.readFileSync('./sql/select_features.sql').toString('utf8'), null);
async function feature_enabled(pg_pool, app_uuid, feature_key) {
  const features = await select_features(pg_pool, [app_uuid]);
  const feature = features.filter((x) => x.name === feature_key);
  if (feature.length === 0) {
    return false;
  }
  return true;
}

async function check_deployment_features(pg_pool, app_uuid, dyno_type) {
  if (dyno_type === 'web') {
    return {
      serviceMesh: await feature_enabled(pg_pool, app_uuid, 'service-mesh'),
      'http2': true, // we only support http2 at this point.
      'http2-end-to-end': await feature_enabled(pg_pool, app_uuid, 'http2-end-to-end'),
      'csp-javascript': await feature_enabled(pg_pool, app_uuid, 'csp-javascript'),
      'csp-media': await feature_enabled(pg_pool, app_uuid, 'csp-media'),
      'csp-unsafe': await feature_enabled(pg_pool, app_uuid, 'csp-unsafe'),
      'csp-embedded': await feature_enabled(pg_pool, app_uuid, 'csp-embedded'),
    };
  }
  return {
    serviceMesh: false,
    http2: true, // we only support http2 at this point.
    'http2-end-to-end': false,
    'csp-javascript': false,
    'csp-media': false,
    'csp-unsafe': false,
    'csp-embedded': false,
  };
}

const select_topic = query.bind(query, fs.readFileSync('./sql/select_topic.sql').toString('utf8'), null);
async function check_topic_exists(pg_pool, topic_key, cluster_key) {
  if (!/-/.test(cluster_key)) {
    throw new httph.NotFoundError(`Invalid cluster '${cluster_key}'. Provide cluster as a UUID or with cluster-region syntax.`);
  }

  const result = await select_topic(pg_pool, [topic_key, cluster_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified topic ${topic_key} does not exist in cluster ${cluster_key}.`);
  }

  return result[0];
}

const select_cluster = query.bind(query, fs.readFileSync('./sql/select_cluster.sql').toString('utf8'), null);
async function check_cluster_exists(pg_pool, cluster_key) {
  if (!/-/.test(cluster_key)) {
    throw new httph.NotFoundError(`Invalid cluster '${cluster_key}'. Provide cluster as a UUID or with cluster-region syntax.`);
  }

  const result = await select_cluster(pg_pool, [cluster_key]);
  if (result.length !== 1) {
    throw new httph.NotFoundError(`The specified cluster ${cluster_key} does not exist.`);
  }

  return result[0];
}

// TODO: This... seems bizarre. Maybe an event model is better?
const select_hooks = query.bind(query, fs.readFileSync('./sql/select_hooks.sql').toString('utf8'), (x) => x);
const insert_hook_result = query.bind(query, fs.readFileSync('./sql/insert_hook_result.sql').toString('utf8'), (x) => x);
const hook_types = [
  require('./hook-types/circleci.js'),
  require('./hook-types/microsoft-teams.js'),
  require('./hook-types/opsgenie.js'),
  require('./hook-types/rollbar.js'),
  require('./hook-types/slack.js'),
  require('./hook-types/pagerduty.js'),
  require('./hook-types/https.js'), // THIS MUST BE LAST, order matters here.
].filter((x) => x.enabled());


async function notify_audits(payload, username) {
  try {
    if (client) {
      let body = Object.assign(JSON.parse(payload), { username });
      if (!body.received_at) {
        const received_at = (new Date()).toISOString();
        body = Object.assign(body, { received_at });
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
          info: JSON.stringify(body),
        },
      });
    }
  } catch (err) {
    console.error('An error occured auditing request:', err);
  }
}

function socs(envs) {
  const blacklist_wri_regex = /([A-z0-9\-_.]+:)[A-z0-9\-_.]+(@tcp\([A-z0-9\-_.]+:[0-9]+\)[A-z0-9\-_./]+)/;
  const blacklist_uri_regex = /([A-z]+:\/\/[A-z0-9\-_.]*:)[A-z0-9\-_.*!&%^*()=+`~,.<>?/\\:;"' \t}{[\]\\|#$}]+(@[A-z0-9\-_.:/]+)/;
  if (!config.envs_blacklist || config.envs_blacklist === '') {
    return envs;
  }
  try {
    const blacklist = config.envs_blacklist.split(',');
    Object.keys(envs).forEach((env) => {
      blacklist.forEach((blEnv) => {
        if (blEnv && blEnv !== '' && env && env !== '' && env.toLowerCase().trim().indexOf(blEnv.toLowerCase().trim()) > -1) {
          envs[env] = '[redacted]';
        }
        if (typeof envs[env] === 'string' && (envs[env] || envs[env] === '')) {
          if (envs[env].startsWith('https://hooks.slack.com/services/')) {
            envs[env] = 'https://hooks.slack.com/services/[redacted]';
          }
          if (envs[env].startsWith('https://outlook.office365.com/webhook/')) {
            envs[env] = 'https://outlook.office365.com/webhook/[redacted]';
          }
          envs[env] = envs[env].replace(blacklist_uri_regex, '$1[redacted]$2');
          envs[env] = envs[env].replace(blacklist_wri_regex, '$1[redacted]$2');
          envs[env] = envs[env].replace(/\?password=([^&]+)/g, '?password=[redacted]');
          envs[env] = envs[env].replace(/&password=([^&]+)/g, '&password=[redacted]');
          envs[env] = envs[env].replace(/\?pwd=([^&]+)/g, '?pwd=[redacted]');
          envs[env] = envs[env].replace(/&pwd=([^&]+)/g, '&pwd=[redacted]');
          envs[env] = envs[env].replace(/\?access_token=([^&]+)/g, '?access_token=[redacted]');
          envs[env] = envs[env].replace(/&access_token=([^&]+)/g, '&access_token=[redacted]');
          envs[env] = envs[env].replace(/\?accessToken=([^&]+)/g, '?accessToken=[redacted]');
          envs[env] = envs[env].replace(/&accessToken=([^&]+)/g, '&accessToken=[redacted]');
          envs[env] = envs[env].replace(/\?refresh_token=([^&]+)/g, '?refresh_token=[redacted]');
          envs[env] = envs[env].replace(/&refresh_token=([^&]+)/g, '&refresh_token=[redacted]');
          envs[env] = envs[env].replace(/\?refreshToken=([^&]+)/g, '?refreshToken=[redacted]');
          envs[env] = envs[env].replace(/&refreshToken=([^&]+)/g, '&refreshToken=[redacted]');
          envs[env] = envs[env].replace(/\?token=([^&]+)/g, '?token=[redacted]');
          envs[env] = envs[env].replace(/&token=([^&]+)/g, '&token=[redacted]');
          envs[env] = envs[env].replace(/\?client_secret=([^&]+)/g, '?client_secret=[redacted]');
          envs[env] = envs[env].replace(/&client_secret=([^&]+)/g, '&client_secret=[redacted]');
          envs[env] = envs[env].replace(/\?clientSecret=([^&]+)/g, '?clientSecret=[redacted]');
          envs[env] = envs[env].replace(/&clientSecret=([^&]+)/g, '&clientSecret=[redacted]');
          envs[env] = envs[env].replace(/\?circle-token=([^&]+)/g, '?circle-token=[redacted]');
          envs[env] = envs[env].replace(/&circle-token=([^&]+)/g, '&circle-token=[redacted]');
        } else {
          console.warn(`The environment variable named ${env} did not have an actual value.`);
        }
      });
    });
    return envs;
  } catch (e) {
    console.log('error filtering environments, returning safety response.');
    console.log(e);
    return {};
  }
}

const insert_action_run = query.bind(query, fs.readFileSync('sql/insert_action_run.sql').toString('utf8'), (result) => result);
const select_latest_image = query.bind(query, fs.readFileSync('./sql/select_latest_image.sql').toString('utf8'), (r) => r);
async function trigger_action(pg_pool, app_key, action_key, triggered_by, source) {
  const app = await check_app_exists(pg_pool, app_key);
  const action = await check_action_exists(pg_pool, app.app_uuid, action_key);

  let image;
  // If there is an image override, use it. Otherwise use the latest app image
  if (action.formation.options && action.formation.options.image && action.formation.options.image !== '') {
    image = action.formation.options.image;
  } else {
    const latest_image = (await select_latest_image(pg_pool, [app.app_uuid]))[0];
    image = registry_image(
      latest_image.build_org_name,
      latest_image.build_app_name,
      latest_image.build_app,
      latest_image.foreign_build_key,
      latest_image.foreign_build_system,
    );
  }

  // Deploy a one-off dyno
  const runid = uuid.v4();
  const labels = {
    'akkeris.io/action': 'true',
    'akkeris.io/action-name': `${action.name}`,
    'akkeris.io/action-uuid': `${action.action}`,
    'akkeris.io/action-run-uuid': `${runid}`,
  };
  let env = null;
  if (action.formation.options && action.formation.options.env && Object.keys(action.formation.options.env).length > 0) {
    env = action.formation.options.env;
  }
  await alamo.oneoff_deploy(
    pg_pool,
    app.space_name,
    app.app_name,
    action.formation.type,
    image,
    action.formation.command,
    labels,
    env,
    action.formation.size,
    runid,
  );
  // Insert an action run into the DB
  const action_run_params = [
    runid,
    action.action,
    'starting',
    source,
    null,
    triggered_by,
  ];
  return (await insert_action_run(pg_pool, action_run_params))[0];
}

const select_actions = query.bind(query, fs.readFileSync('sql/select_all_actions.sql').toString('utf8'), (result) => result);
async function notify_actions(pg_pool, app_uuid, type, username) {
  // TODO: Add functionality to do this in the future?
  assert.ok(type !== 'destroy', "Actions can't fire on destroy events!");

  // Filter actions that trigger on provided type
  const actions = (await select_actions(pg_pool, [app_uuid]))
    .filter((action) => action.events && action.events !== '' && action.events.split(',').includes(type));

  // Trigger each action and report errors to the console
  actions.forEach((action) => {
    trigger_action(pg_pool, app_uuid, action.action, username, type)
      .catch((e) => console.error(`Could not trigger action ${action.action} - `, e));
  });
}

const select_hooks_destroy = query.bind(query, fs.readFileSync('./sql/select_hooks_destroy.sql').toString('utf8'), (x) => x);
async function notify_hooks(pg_pool, app_uuid, type, payload, username) {
  try {
    assert.ok(typeof (payload) === 'string', 'The specified payload was not a string!');
    notify_audits(payload, username).catch((e) => console.error(e));
    notify_actions(pg_pool, app_uuid, type, username).catch((e) => console.error(e));
    let hooks = [];
    if (type === 'destroy') {
      hooks = (await select_hooks_destroy(pg_pool, [app_uuid]))
        .filter((x) => x.active && x.url && x.events.split(',').map((y) => y.toLowerCase().trim()).includes(type.toLowerCase()));
    } else {
      hooks = (await select_hooks(pg_pool, [app_uuid]))
        .filter((x) => x.active && x.url && x.events.split(',').map((y) => y.toLowerCase().trim()).includes(type.toLowerCase()));
    }
    await Promise.all(hooks.map(async (hook) => {
      const id = uuid.v4();
      // calculate the hash signature
      const secret = decrypt_token(config.encrypt_key, hook.secret);
      const hmac = crypto.createHmac('sha1', secret);
      const recorded_url = socs({ URL: hook.url }).URL;
      try {
        let token = null;
        if (type !== 'destroy' && type !== 'crashed' && type !== 'preview-released') {
          token = await create_temp_jwt_token(
            config.jwt_private_key,
            username,
            config.akkeris_api_url,
            config.akkeris_api_url,
            false,
            { hook_id: id, hook_type: type, app_uuid },
          ); // never permit elevated access.
        }
        const hook_type = hook_types.filter((x) => x.test(hook.url))[0];
        assert.ok(hook_type, `No valid hook was found for the url ${hook.url}`);
        const {
          sent_metadata, sent_data, received_code, received_metadata, received_data,
        } = await hook_type.fire(id, hook.url, type, JSON.parse(payload), hmac.update(payload).digest('hex'), {}, token);
        await insert_hook_result(pg_pool, [
          id,
          hook.hook,
          hook.events,
          recorded_url,
          received_code,
          JSON.stringify(received_metadata),
          received_data.toString('utf8'),
          JSON.stringify(sent_metadata),
          sent_data,
        ]);
      } catch (e) {
        console.error('Error firing webhook:', e);
        await insert_hook_result(pg_pool, [
          id,
          hook.hook,
          hook.events,
          recorded_url,
          0,
          null,
          JSON.stringify(e),
          JSON.stringify({}),
          payload,
        ]);
      }
    }));
  } catch (err) {
    console.error('An error occured firing a hook:', err, app_uuid, type, payload, username);
  }
}

function check_uuid(puuid) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(puuid) === null) {
    throw new httph.UnprocessibleEntityError('The specified uuid was invalid.');
  }
}

module.exports = {
  log_event,
  sign_to_token,
  verify_to_token,
  http_jwks_uri,
  create_temp_jwt_token,
  jwks_verify,
  jwks_sign,
  socs,
  check_uuid,
  determine_app_url,
  alamo,
  service_by_id_or_name,
  plan_by_id_or_name,
  feature_enabled,
  app_exists: check_app_exists,
  action_exists: check_action_exists,
  action_run_exists: check_action_run_exists,
  addon_exists: check_addon_exists,
  build_exists: check_build_exists,
  topic_exists: check_topic_exists,
  cluster_exists: check_cluster_exists,
  space_exists: check_space_exists,
  org_exists: check_org_exists,
  site_exists: check_site_exists,
  region_exists: check_region_exists,
  stack_exists: check_stack_exists,
  release_exists: check_release_exists,
  formations_exists: check_formations_exists,
  latest_release: select_latest_release_by_app,
  filter_attachments_exists: check_filter_attachments,
  deployment_filters: check_deployment_filters,
  deployment_features: check_deployment_features,
  registry_image,
  encrypt_token,
  decrypt_token,
  notify_audits,
  notify_hooks,
  preview_apps,
  update_release_status,
  update_action_run_status,
  services: () => global.addon_services,
  random_name: () => nouns[Math.floor(nouns.length * Math.random())],
  HttpError: httph.HttpError,
  InternalServerError: httph.InternalServerError,
  BadRequestError: httph.BadRequestError,
  ServiceUnavailableError: httph.ServiceUnavailableError,
  UnprocessibleEntityError: httph.UnprocessibleEntityError,
  NotAllowedError: httph.NotAllowedError,
  ConflictError: httph.ConflictError,
  NoFormationsFoundError: httph.NoFormationsFoundError,
  NotFoundError: httph.NotFoundError,
  WaitingForResourcesError: httph.WaitingForResourcesError,
  UnauthorizedError: httph.UnauthorizedError,
  NotImplementedError: httph.NotImplementedError,
  lifecycle: (new ApplicationLifecycle()),
  init,
  query_audits,
  trigger_action,
};
