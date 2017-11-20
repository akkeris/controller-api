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

function registry_image(org_name, app_name, app_uuid, build_tag) {
  return config.docker_registry_host + '/' + config.gm_docker_repo +'/' + app_name + '-' + app_uuid + ':0.' + build_tag;
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

async function notify_hooks(pg_pool, app_uuid, type, payload) {
  console.assert(typeof(payload) === 'string', 'The specified payload was not a string!')
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
            insert_hook_result(pg_pool, [id, hook.hook, hook.events, hook.url, res.statusCode, JSON.stringify(req.headers), data.toString('utf8'), JSON.stringify(options.headers), payload])
              .catch((err) => {
                console.warn('Error recording hook result:', err);
                console.warn('Data not recorded: ', [id, hook.hook, hook.events, hook.url, req.statusCode, JSON.stringify(req.headers), data.toString('utf8'), JSON.stringify(options.headers), payload]);
              });
          });
        });
        req.on('error', (e) => { console.error('Unable to make webhook request: ', e); });
        req.write(payload);
        req.end();
      }
    })
  } catch (err) {
    console.error("An error occured firing a hook:", err);
  }
}


module.exports = {
  alamo:require('./alamo.js'),
  app_exists:check_app_exists,
  space_exists:check_space_exists,
  org_exists:check_org_exists,
  site_exists:check_site_exists,
  region_exists:check_region_exists,
  stack_exists:check_stack_exists,
  registry_image:registry_image,
  encrypt_token:encrypt_token,
  decrypt_token:decrypt_token,
  notify_hooks:notify_hooks,
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
  UnauthorizedError:http_help.UnauthorizedError
};