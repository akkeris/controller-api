"use strict";

const common = require('./common.js');
const config = require('./config.js');
const logs = require('./log-drains.js');
const httph = require('./http_helper.js');
const lifecycle = require('./lifecycle.js');
const addon_services = require('./addon-services.js');
const spaces = require('./spaces.js');

function from_alamo_to_config_var(config_vars_tmp) {
  let config_vars = {};
  if(config_vars_tmp) {
    config_vars_tmp.forEach((x) => config_vars[x.varname] = x.varvalue);
  }
  return config_vars;
}


async function get_app_only_config(pg_pool, app_name, space_name) {
  let data = await common.alamo.config.set.request(pg_pool, app_name, space_name)
  return from_alamo_to_config_var(data);
}

async function get_app_config(pg_pool, app_name, space_name, app_uuid) {
  let config_var_set = await get_app_only_config(pg_pool, app_name, space_name)
  let service_data = await addon_services.service_config_vars(pg_pool, app_uuid, space_name, app_name)
  Object.keys(service_data).forEach((key) => {
    if(config_var_set[key]) {
      console.warn('Warning, duplicate config sets for key', key, 'on app', app_uuid);
    }
    config_var_set[key] = service_data[key];
  })
  return config_var_set
}

function validate_config_var(config_var_name) {
  console.assert((/^[A-z\_0-9]+$/g).exec(config_var_name) !== null,
    'The config variable ' + config_var_name + ' is invalid. Configuration variables must be alpha numeric names but may contain underscores.');
}

async function update(pg_pool, app_uuid, app_name, space_name, space_tags, org, config_vars, user) {
  if(app_name.indexOf('-') > -1) {
    throw new common.UnprocessibleEntityError(`Invalid app name: ${app_name}`)
  }
  let existing_config_vars = await common.alamo.config.set.request(pg_pool, app_name, space_name)
  let service_data = await addon_services.service_config_vars(pg_pool, app_uuid, space_name, app_name)
  let config_out = from_alamo_to_config_var(existing_config_vars);
  if(typeof(config_vars) === "string" || Buffer.isBuffer(config_vars)) {
    config_vars = JSON.parse(config_vars.toString('utf8'));
  }
  try {
    Object.keys(config_vars).forEach(validate_config_var);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  for(let key in config_vars) {
    if(service_data[key]) {
      throw new common.ConflictError(`The environment variable ${key} was set by a service, remove the accompanying service to modify or delete this.`)
    }
  }
  let changed = false;
  let changes = [];
  await Promise.all(Object.keys(config_vars).filter((x) => x !== '').map(async (key) => {
    if(config_vars[key] === null) {
      changed = true;
      changes.push({"type":"delete", "name":key});
      // delete the config value.
      logs.event(pg_pool, app_name, space_name, "Removing " + key + ' config var');
      delete config_out[key];
      return common.alamo.config.delete(pg_pool, app_name, space_name, key);
    } else if (config_out[key] || config_out[key] === '') {
      changed = true;
      changes.push({"type":"update", "name":key});
      // update the config value.
      logs.event(pg_pool, app_name, space_name, "Set " + key + ' config var');
      config_out[key] = config_vars[key];
      return common.alamo.config.update(pg_pool, app_name, space_name, key, config_vars[key]);
    } else {
      changes.push({"type":"create", "name":key});
      changed = true;
      // add the config value.
      logs.event(pg_pool, app_name, space_name, "Added " + key + ' config var');
      config_out[key] = config_vars[key];
      return common.alamo.config.add(pg_pool, app_name, space_name, key, config_vars[key]);
    }
  }));
  Object.assign(config_out, service_data);
  if(space_tags.indexOf('compliance=socs') > -1) {
    config_out = common.socs(config_out);
  }
  if(changed) {
    setTimeout(() => {
      common.notify_hooks(pg_pool, app_uuid, 'config_change', JSON.stringify({
        'action':'config_change',
        'app':{
          'name':app_name,
          'id':app_uuid
        },
        'space':{
          'name':space_name
        },
        'changes':changes,
        'config_vars':config_out
      }), user ? user : "System"); 
      lifecycle.restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org, 'Config Vars Changed').catch((err) => { /* do nothing */ });
    }, 10);
  }
  return config_out;
}

async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  let config_var_set = await get_app_config(pg_pool, app.app_name, app.space_name, app.app_uuid)
  if(space.tags.indexOf('compliance=socs') > -1) {
    return httph.ok_response(res, JSON.stringify(common.socs(config_var_set)))
  } else {
    return httph.ok_response(res, JSON.stringify(config_var_set))
  }
}

async function http_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  let config_vars = await httph.buffer(req);
  return await httph.ok_response(res, 
    JSON.stringify(await update(pg_pool, app.app_uuid, app.app_name, app.space_name, space.tags, app.org_uuid, config_vars, req.headers['x-username'])))
}

module.exports = {
  get_app_only:get_app_only_config,
  get:get_app_config,
  update:update,
  http:{
    get:http_get,
    update:http_update
  },
};