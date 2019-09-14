"use strict"


const assert = require('assert')
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const common = require('../common.js');
const alamo = require('../alamo.js')
const config = require('../config.js');
const httph = require('../http_helper.js');
const query = require('../query.js');
const formation = require('../formations.js');
const lifecycle = require('../lifecycle.js');

function random_hex() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if(err) {
        reject(err)
      } else {
        resolve(buffer.toString('hex').toUpperCase())
      }
    })
  })
}

const env_name = 'SECURE_KEY'
const name = 'securekey'
const human_name = 'Secure Key'
const description = 'Providing automatic and graceful key rotation'
const website = '#'

async function create_securekey(pg_pool, app_name, space_name, foreign_key) {
  let config_set = await alamo.config.set.create(pg_pool, app_name, space_name, foreign_key)
  let primary = await random_hex()
  assert.ok(primary.length === 64, 'The primary secure key length was not 64 characters long.')
  let secondary = await random_hex()
  assert.ok(secondary.length === 64, 'The secondary secure key length was not 64 characters long.')
  let value = `${primary},${secondary}`
  assert.ok(value.length === 129, 'The length of the secure key was not 129 characters after rotating.')
  await alamo.config.add(pg_pool, app_name, space_name, env_name, value, foreign_key)
  return value
}

async function delete_securekey(pg_pool, app_name, space_name, foreign_key) {
  await alamo.config.set.delete(pg_pool, app_name, space_name, foreign_key)
}


const select_service_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });

async function rotate(pg_pool, app_name, space_name, service) {
  let config_set = await alamo.config.set.request(pg_pool, app_name, space_name, service.foreign_key)
  assert.ok(config_set.length === 1, 'The config set for secure key contained more than one key val pair.')
  assert.ok(config_set[0].varvalue.indexOf(',') !== -1, 'The value for SECURE_KEY was invalid it did not contain a comma.')
  // Save off the last value
  assert.ok(config_set[0].varvalue.length === 129, 'The length of the secure key was not 129 characters before rotating.')
  let primary = config_set[0].varvalue.split(',')[0]
  assert.ok(primary.length === 64, 'The primary secure key length was not 64 characters long.')
  let secondary = await random_hex()
  assert.ok(secondary.length === 64, 'The secondary secure key length was not 64 characters long.')
  config_set[0].varvalue = `${secondary},${primary}`
  assert.ok(config_set[0].varvalue.length === 129, 'The length of the secure key was not 129 characters after rotating.')
  await alamo.config.update(pg_pool, app_name, space_name, env_name, config_set[0].varvalue, service.foreign_key)

  let attachments = await select_service_attachments(pg_pool, [service.service])
  attachments.forEach((attachment) => {
    lifecycle.restart_and_redeploy_app(pg_pool, attachment.app, attachment.app_name, attachment.space, attachment.org, 'Rotated SECURE_KEY').catch((err) => { /* do nothing */ });
  })
}

let actions_desc = [{
  "id":uuid.unparse(crypto.createHash('sha256').update("securekey:rotate").digest(), 16),
  "label":"forces rotation of the secure key",
  "action":"rotate",
  "url":"",
  "requires_owner":true
}]

let actions_exec = {
  'rotate':{
    exec:async function(pg_pool, plan, service, app, action_id, req_url) {
      await rotate(pg_pool, app.name, app.space, service)
      return {"status":"ok"}
    }
  }
};

function info(regions) {
  return {
    "actions":actions_desc,
    "cli_plugin_name": name,
    "created_at": "2018-04-09T12:00:00Z",
    "human_name": human_name,
    "description": description,
    "image_url": null,
    "id": uuid.unparse(crypto.createHash('sha256').update(name).digest(), 16),
    "name": name,
    "state": "ga",
    "available_regions":regions,
    "supports_upgrading": false,
    "supports_multiple_installations": false,
    "supports_sharing": true,
    "updated_at": "2016-08-09T12:00:00Z"
  };
}

function create_service_attachment_name(addon_plan) {
  return name + '-' + common.random_name() + '-' + Math.floor(Math.random() * 10000);
}

function get_actions() {
  return actions_desc
}

async function action(pg_pool, plan, service, app, action_id, req_url, payload) {
  let actions = actions_exec
  if(actions && actions[action_id]) {
    return await actions[action_id].exec(pg_pool, plan, service, app, action_id, req_url, payload)
  } else {
    throw new common.NotFoundError("No such action found.")
  }
}

const insert_service = query.bind(query, fs.readFileSync('./sql/insert_service.sql').toString('utf8'), (r) => { return r; });
const insert_service_attachment = query.bind(query, fs.readFileSync('./sql/insert_service_attachment.sql').toString('utf8'), (r) => { return r; });
const delete_service = query.bind(query, fs.readFileSync('./sql/delete_service.sql').toString('utf8'), (r) => { return r; });
const delete_service_attachment = query.bind(query, fs.readFileSync('./sql/delete_service_attachment.sql').toString('utf8'), (r) => { return r; });


async function attach(pg_pool, app, addon_plan, service, owner) {
  // TODO: what is app? get rid of this.
  let formations = await common.formations_exists(pg_pool, app.id);
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  await common.alamo.config.include(pg_pool, app.space, 'config', `${app.name}-${app.space}`, 'service', service.foreign_key)

  let addon = info()
  let service_attachment_name = create_service_attachment_name(addon, addon_plan)
  let service_attachment_uuid = uuid.v4()
  let created_updated = new Date();

  await insert_service_attachment(pg_pool, [service_attachment_uuid, service_attachment_name, service.service, app.id, owner && owner.id === app.id ? true : false, addon_plan.primary, created_updated, created_updated]);
  
  service.name = service_attachment_name;
  return service
}

async function detach(pg_pool, app, addon_plan, service) {
  await common.alamo.config.exclude(pg_pool, app.space, 'config', `${app.name}-${app.space}`, 'service', service.foreign_key)
  await delete_service_attachment(pg_pool, [service.service, app.id])
  return service
}

async function provision(pg_pool, app, addon_plan) {
  // TODO: what is app? get rid of this.
  let formations = await common.formations_exists(pg_pool, app.id);
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  let service_uuid = uuid.v4()
  let service = {
    foreign_key:name + '.' + service_uuid,
    config_vars:{},
    service:service_uuid
  };
  service.config_vars[env_name] = await create_securekey(pg_pool, app.name, app.space, service.foreign_key)
  let created_updated = new Date();
  let addon = info();
  await insert_service(pg_pool, [service_uuid, addon.id, addon.name, addon_plan.id, addon_plan.name, addon_plan.price.cents, service.foreign_key, created_updated, created_updated]);
  service.created = created_updated;
  service.updated = created_updated;
  return attach(pg_pool, app, addon_plan, service, app);
}

async function unprovision(pg_pool, app, addon_plan, service) {
  await delete_securekey(pg_pool, app.name, app.space, service.foreign_key)
  await delete_service(pg_pool, [service.service]);
  await detach(pg_pool, app, addon_plan, service);
  return service
}

function plans(regions) {
  return [
    {
      "addon_service": {
        "id": uuid.unparse(crypto.createHash('sha256').update(name).digest(), 16),
        "name": name
      },
      "created_at": "2016-08-09T12:00:00Z",
      "default": false,
      "description": description,
      "human_name": "fortnightly",
      "id": uuid.unparse(crypto.createHash('sha256').update(name + ":fortnightly").digest(), 16),
      "installable_inside_private_network": true,
      "installable_outside_private_network": true,
      "name":name + ":fortnightly",
      "key":"fortnightly",
      "price": {
        "cents": 0,
        "unit": "month",
        "contract": false,
      },
      "available_regions":regions,
      "compliance":[],
      "space_default": false,
      "state": "public",
      "updated_at": "2016-08-09T12:00:00Z",
      "attributes":{},
    }
  ];
}

async function get_config_vars(pg_pool, service, space_name, app_name) {
  return {}
}

module.exports = async function(pg_pool) {
  let regions = await common.alamo.regions(pg_pool);
  return [{
    info:info.bind(info,regions.map((x) => x.name)),
    plans:plans.bind(plans,regions.map((x) => x.name)),
    provision,
    unprovision,
    attach,
    detach,
    action,
    get_actions:get_actions.bind(info, regions.map((x) => x.name)),
    get_state:function() { return {"state":"provisioned", "state_description":""} },
    update:function() { throw new common.ConflictError("Cannot upgrade this plan as changes are unsupported")},
    config_vars:get_config_vars,
  }]
};

