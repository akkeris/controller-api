"use strict";

const fs = require('fs')
const http_help = require('./http_helper.js')
const config = require('./config.js')
const http = require('http')
const https = require('https')
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
  let cipher = crypto.createCipher('aes192', key);
  let enc_token = cipher.update(new Buffer(token, 'utf8'));
  enc_token = Buffer.concat([enc_token, cipher.final()]);
  return enc_token.toString('base64');
}

function decrypt_token(key, enc_token) {
  let deciph = crypto.createDecipher('aes192', key);
  let token = deciph.update(new Buffer(enc_token, 'base64'), 'utf8');
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

function init() {
  if (!client) return

  client.indices.create({  
    index: 'audit'
  },function(err,resp,status) {
  });
}

async function query_audits(uri) {
  const app = uri.searchParams.get('app') || '*'
  const space = uri.searchParams.get('space') || '*'
  const user = uri.searchParams.get('user') || '*'
  const size = uri.searchParams.get('size')
  if (!client) {
    throw new http_help.NotImplementedError(`The auditing feature is not enabled`)
  }
  return await client.search({
    index: 'audit',
      q: 'app.name:' + app + ' AND space.name:'+ space + ' AND username:'+ user,
      sort: 'timestamp:desc',
      size: size ? size : null
  })
}

function registry_image(org_name, app_name, app_uuid, build_tag) {
  return config.docker_registry_host + '/' + config.gm_docker_repo +'/' + app_name + '-' + app_uuid + ':0.' + build_tag;
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

let select_org = query.bind(query,  fs.readFileSync("./sql/select_org.sql").toString('utf8'), null)
async function check_org_exists(pg_pool, org_key) {
  let result = await select_org(pg_pool, [org_key])
  if(result.length !== 1) {
    throw new http_help.NotFoundError(`The specified organization ${org_key} does not exist.`)
  }
  return result[0]
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


// TODO: This... seems bizarre. Maybe an event model is better?
const select_hooks = query.bind(query, fs.readFileSync('./sql/select_hooks.sql').toString('utf8'), (x) => { return x; });
const insert_hook_result = query.bind(query, fs.readFileSync('./sql/insert_hook_result.sql').toString('utf8'), (x) => { return x; });

async function notify_hooks(pg_pool, app_uuid, type, payload, username) {
  console.assert(typeof(payload) === 'string', 'The specified payload was not a string!')
  
  try {
    if (client) {
      payload = JSON.stringify(Object.assign(JSON.parse(payload),{username}))
      if (!payload.timestamp){
        let timestamp = (new Date()).toISOString()
        payload = JSON.stringify(Object.assign(JSON.parse(payload),{timestamp}))
      }
      client.index({  
        index: 'audit',
        type: 'event',
        body: payload
      });
    }
  } catch (err) {
    console.error("An error occured auditing request:", err);
  }
  try {
    let hooks = await select_hooks(pg_pool, [app_uuid]);
    hooks.forEach((hook) => {
      if(hook.active === true && hook.url && hook.events.split(',').map((x) => { return x.toLowerCase().trim(); }).indexOf(type.toLowerCase()) !== -1) 
      {
        let service = null;
        if(hook.url.toLowerCase().startsWith('https://')) {
          service = https;
        } else if (hook.url.toLowerCase().startsWith("http://")) {
          service = http;
        } else {
          return console.error('unable to fire webhook:', hook.url);
        }

        let id = uuid.v4();
        let options = url.parse(hook.url);
        options.headers = options.headers || {};
        options.headers['x-appkit-event'] = type;
        options.headers['x-appkit-delivery'] = id;
        options.headers['content-type'] = 'application/json';
        options.headers['user-agent'] = 'appkit-hookshot';
        options.method = 'post';

        // calculate the hash signature
        let secret = decrypt_token(process.env.ENCRYPT_KEY, hook.secret);
        const hmac = crypto.createHmac('sha1', secret);
        options.headers['x-appkit-signature'] = ('sha1=' + hmac.update(payload).digest('hex'));

        // fire the hook, record its result.
        let req = service.request(options, (res) => {
          let data = new Buffer(0);
          res.on('data', (chunk) => Buffer.concat([data, chunk]));
          res.on('end', () => {
            insert_hook_result(pg_pool, [id, hook.hook, hook.events, hook.url, res.statusCode, JSON.stringify(res.headers), data.toString('utf8'), JSON.stringify(options.headers), payload])
              .catch((err) => {
                console.warn('Error recording hook result:', err);
                console.warn('Data not recorded: ', [id, hook.hook, hook.events, hook.url, res.statusCode, JSON.stringify(res.headers), data.toString('utf8'), JSON.stringify(options.headers), payload]);
              });
          });
        });
        req.on('error', (e) => {
          insert_hook_result(pg_pool, [id, hook.hook, hook.events, hook.url, 0, null, JSON.stringify(e), JSON.stringify(options.headers), payload])
              .catch((err) => {
                console.warn('Error recording hook result (during hook error):', err);
                console.warn('Data not recorded (during hook error): ', [id, hook.hook, hook.events, hook.url, req.statusCode, JSON.stringify(req.headers), data.toString('utf8'), JSON.stringify(options.headers), payload]);
              });
        });
        req.write(payload);
        req.end();
      }
    })
  } catch (err) {
    console.error("An error occured firing a hook:", err);
  }
}

function check_uuid(puuid) {
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(puuid) === null) {
    throw new http_help.UnprocessibleEntityError("The specified uuid was invalid.")
  }
}

function socs(envs) {
  let blacklist_wri_regex = /([A-z0-9\-\_\.]+\:)[A-z0-9\-\_\.]+(\@tcp\([A-z0-9\-\_\.]+\:[0-9]+\)[A-z0-9\-\_\.\/]+)/;
  let blacklist_uri_regex = /([A-z]+\:\/\/[A-z0-9\-\_\.]+\:)[A-z0-9\-\_\.]+(\@[A-z0-9\-\_\.\:\/]+)/;
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
          envs[env] = envs[env].replace(blacklist_uri_regex, '$1[redacted]$2')
          envs[env] = envs[env].replace(blacklist_wri_regex, '$1[redacted]$2')
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

module.exports = {
  socs,
  check_uuid,
  determine_app_url,
  alamo,
  app_exists:check_app_exists,
  space_exists:check_space_exists,
  org_exists:check_org_exists,
  site_exists:check_site_exists,
  region_exists:check_region_exists,
  stack_exists:check_stack_exists,
  registry_image,
  encrypt_token,
  decrypt_token,
  notify_hooks,
  preview_apps,
  random_name: function() { return nouns[Math.floor(nouns.length * Math.random())]; },
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
  query_audits
};