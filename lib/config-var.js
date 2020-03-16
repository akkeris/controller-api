"use strict";

const assert = require('assert');
const fs = require('fs');
const common = require('./common.js');
const config = require('./config.js');
const logs = require('./log-drains.js');
const httph = require('./http_helper.js');
const lifecycle = require('./lifecycle.js');
const addons = require('./addons.js');
const spaces = require('./spaces.js');
const query = require('./query.js');

const update_app_updated_at = query.bind(query, fs.readFileSync("./sql/update_app_updated_at.sql").toString('utf8'), (r) => { return r; });

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
  let service_data = await addons.service_config_vars(pg_pool, app_uuid, space_name, app_name)
  Object.keys(service_data).forEach((key) => {
    if(config_var_set[key]) {
      console.warn('Warning, duplicate config sets for key', key, 'on app', app_uuid);
    }
    config_var_set[key] = service_data[key];
  })
  return config_var_set
}

function validate_config_var(config_var_name) {
  assert.ok((/^[A-z\_0-9]+$/g).exec(config_var_name) !== null,
    'The config variable ' + config_var_name + ' is invalid. Configuration variables must be alpha numeric names but may contain underscores.');
}

const system_config_vars = {
  "PORT":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"This is the TCP/IP port the app must respond to http requests on."
  },
  "AKKERIS_DEPLOYMENT":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"The name of the application excluding the spaces suffix, e.g., 'app' in 'app-space'."
  },
  "AKKERIS_APPLICATION":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"The full name of the application including hte space suffix. e.g., 'app-space'"
  },
  "AKKERIS_SPACE":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"The name of the space the app is running in."
  },
  "AKKERIS_GIT_SHA1":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"Available only during build time, this is the SHA of the git commit that triggered the build."
  },
  "AKKERIS_GIT_BRANCH":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"Available only during build time, this is the branch of the git commit that triggered the build."
  },
  "AKKERIS_GIT_REPO":{
    "type":"system",
    "addon":null,
    "read_only":true,
    "required":true,
    "description":"Available only during build time, this is the repo of the git commit that triggered the build, usually represented as a URI."
  },
};

let delete_config_var_notes = query.bind(query, fs.readFileSync('./sql/delete_config_var_notes.sql').toString('utf8'), null);
async function update(pg_pool, app_uuid, app_name, space_name, space_tags, org, config_vars, user) {
  if(app_name.indexOf('-') > -1) {
    throw new common.UnprocessibleEntityError(`Invalid app name: ${app_name}`)
  }
  let existing_config_vars = await common.alamo.config.set.request(pg_pool, app_name, space_name)
  let service_data = await addons.service_config_vars(pg_pool, app_uuid, space_name, app_name)
  let reserved_config_vars = Object.keys(system_config_vars);
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
    if(reserved_config_vars.includes(key)) {
      throw new common.ConflictError(`The environment variable ${key} is reserved and cannot be changed through config vars.`)
    }
    if(service_data[key]) {
      throw new common.ConflictError(`The environment variable ${key} was set by a service, remove the accompanying service to modify or delete this.`)
    }
    if(config_vars[key] === null && !config_out[key]) {
      throw new common.ConflictError(`The environment variable ${key} does not exist and cannot be removed.`)
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
      await delete_config_var_notes(pg_pool, [app_uuid, key]);
      await update_app_updated_at(pg_pool, [app_uuid]);
      return common.alamo.config.delete(pg_pool, app_name, space_name, key);
    } else if (config_out[key] || config_out[key] === '') {
      changed = true;
      changes.push({"type":"update", "name":key});
      // update the config value.
      logs.event(pg_pool, app_name, space_name, "Set " + key + ' config var');
      config_out[key] = config_vars[key];
      await update_app_updated_at(pg_pool, [app_uuid]);
      return common.alamo.config.update(pg_pool, app_name, space_name, key, config_vars[key]);
    } else {
      changes.push({"type":"create", "name":key});
      changed = true;
      // add the config value.
      logs.event(pg_pool, app_name, space_name, "Added " + key + ' config var');
      config_out[key] = config_vars[key];
      await update_app_updated_at(pg_pool, [app_uuid]);
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
        changes,
        'config_vars':config_out
      }), user ? user : "System");
      lifecycle.restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org, 'Config Vars Changed').catch((err) => console.error(err));
    }, 10);
  }
  return config_out;
}

let select_config_var_notes = query.bind(query, fs.readFileSync('./sql/select_config_var_notes.sql').toString('utf8'), null);
let upsert_config_var_notes = query.bind(query, fs.readFileSync('./sql/upsert_config_var_notes.sql').toString('utf8'), null);
async function get_config_var_notes(pg_pool, app_uuid, space_name, app_name) {
  let service_config_info = await addons.service_config_info(pg_pool, app_uuid, space_name, app_name);
  let user_config_vars = await get_app_only_config(pg_pool, app_name, space_name);
  let notes_config_vars = await select_config_var_notes(pg_pool, [app_uuid]);

  let response = JSON.parse(JSON.stringify(system_config_vars));
  for(let service_info of service_config_info) {
    for(let key in service_info.config_vars) {
      let notes = notes_config_vars.filter((x) => x.key === key)[0];
      if(!response[key]) {
        response[key] = {
          "type":"addon",
          "addon":{
            "id":service_info.addon.service_attachment,
            "name":service_info.addon.name,
          },
          "read_only":false,
          "required":notes ? notes.required : false,
          "description":notes ? notes.description : "",
        }
      }
    }
  }
  for(let key in user_config_vars) {
    let notes = notes_config_vars.filter((x) => x.key === key)[0];
    if(!response[key]) {
      response[key] = {
        "type":"user",
        "addon":null,
        "read_only":false,
        "required":notes ? notes.required : false,
        "description":notes ? notes.description : "",
      }
    }
  }
  return response;
}

async function update_config_var_notes(pg_pool, app_uuid, app_name, space_name, notes) {
  let config_var_notes = await get_config_var_notes(pg_pool, app_uuid, space_name, app_name);
  for(let key in notes) {
    if(!config_var_notes[key]) {
      throw new common.UnprocessibleEntityError(`The config var ${key} does not exist on this app.`);
    }
    if(system_config_vars[key]) {
      throw new common.ConflictError(`The config var ${key} cannot be updated as its a system set config var.`);
    }
  }
  for(let key in notes) {
    if(notes[key]) {
      if(!notes[key].required && notes[key].required !== false) {
        notes[key].required = null;
      }
      if(!notes[key].description && notes[key].description !== "") {
        notes[key].description = null;
      }
      await upsert_config_var_notes(pg_pool, [app_uuid, key, notes[key].description, notes[key].required, false]);
    } else if (notes[key] === null) {
      await upsert_config_var_notes(pg_pool, [app_uuid, key, "", false, true]);
    }
  }
}

async function http_notes_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let space = await common.space_exists(pg_pool, app.space_name);
  return httph.ok_response(res, 
    JSON.stringify(await get_config_var_notes(pg_pool, app.app_uuid, app.space_name, app.app_name)));
}

async function http_notes_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  let payload = await httph.buffer_json(req);
  await update_config_var_notes(pg_pool, app.app_uuid, app.app_name, app.space_name, payload);
  return httph.ok_response(res, 
    JSON.stringify(await get_config_var_notes(pg_pool, app.app_uuid, app.space_name, app.app_name)));
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
  update,
  notes:{
    update:update_config_var_notes,
    get:get_config_var_notes,
  },
  http:{
    notes:{
      get:http_notes_get,
      update:http_notes_update,
    },
    get:http_get,
    update:http_update
  },
};