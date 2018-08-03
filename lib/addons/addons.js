"use strict"


const assert = require('assert')
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const common = require('../common.js');
const config = require('../config.js');
const httph = require('../http_helper.js');
const formation = require('../formations.js');
const query = require('../query.js');

function transform_plan(addon_definition, plan) {
  return {
    "addon_service": {
      "id": addon_definition.id,
      "name": addon_definition.name
    },
    "created_at": "2016-08-09T12:00:00Z",
    "default": false,
    "description": plan.description,
    "human_name": plan.size[0].toUpperCase() + plan.size.substring(1),
    "id": uuid.unparse(crypto.createHash('sha256').update(addon_definition.name + ":" + plan.size).digest(), 16),
    "installable_inside_private_network": true,
    "installable_outside_private_network": true,
    "name": addon_definition.name + ":" + plan.size,
    "key":plan.size,
    "price": {
      "cents": addon_definition.plan_price[plan.size] || 0,
      "unit": "month"
    },
    "available_regions":plan.regions,
    "compliance":plan.compliance || [],
    "space_default": false,
    "state": plan.state ? plan.state : "public",
    "updated_at": "2016-08-09T12:00:00Z",
    "attributes":plan.attributes ? plan.attributes : {}
  };
}

function info(addon_definition) {
  let available_regions = addon_definition.plans.map((x) => x.regions).reduce((sum, x) => sum.concat(x), []).filter((x, i, self) => self.indexOf(x) === i)
  return {
    "actions":addon_definition.get_actions() || [],
    "cli_plugin_name": addon_definition.short_name,
    "created_at": "2016-08-09T12:00:00Z",
    "description": addon_definition.description,
    "human_name": addon_definition.human_name,
    "id": addon_definition.id,
    "name": addon_definition.name,
    "state": "ga",
    "available_regions":available_regions,
    "supports_multiple_installations": true,
    "supports_sharing": typeof(addon_definition.sharable) === 'undefined' ? true : addon_definition.sharable,
    "updated_at": "2016-08-09T12:00:00Z"
  };
}

async function get_plans(type, pg_pool) {
  assert.ok(pg_pool, 'get_plans called without pg_pool')
  return await common.alamo.service_plans(pg_pool, type)
}

function transform_service(app, addon_definition, addon_plan, service) {
  return {
    "actions": addon_definition.actions,
    "addon_service": {
      "id": addon_definition.id,
      "name": addon_definition.name
    },
    "app": {
      "id": app.id,
      "name": app.name + '-' + app.space
    },
    "config_vars": service.config_vars,
    "created_at": (new Date(service.created)).toISOString(),
    "id": service.service,
    "name": service.name,
    "plan": {
      "id": addon_plan.id,
      "name": addon_plan.name
    },
    "provider_id": "alamo",
    "updated_at": (new Date(service.updated)).toISOString(),
    "web_url": `${config.appkit_ui_url}/#/apps/${app.name}-${app.space}`
  };
}

function create_service_attachment_name(addon_definition, addon_plan) {
  return addon_definition.name + '-' + common.random_name() + '-' + Math.floor(Math.random() * 10000);
}

function get_actions(addon_definition) {
  return addon_definition.get_actions();
}

async function action(addon_definition, pg_pool, plan, service, app, action_id, req_url, payload) {
  return await addon_definition.action(pg_pool, plan, service, app, action_id, req_url, payload);
}

const insert_service = query.bind(query, fs.readFileSync('./sql/insert_service.sql').toString('utf8'), (r) => { return r; });
const insert_service_attachment = query.bind(query, fs.readFileSync('./sql/insert_service_attachment.sql').toString('utf8'), (r) => { return r; });
const delete_service = query.bind(query, fs.readFileSync('./sql/delete_service.sql').toString('utf8'), (r) => { return r; });
async function provision(addon_definition, pg_pool, app, addon_plan) {
  let service = await addon_definition.provision(pg_pool, addon_definition.alamo_name, app.name, app.space, app.org, addon_plan)
  let service_uuid = uuid.v4()
  let created_updated = new Date()
  try {
    await insert_service(pg_pool, [service_uuid, addon_definition.id, addon_definition.name, addon_plan.id, addon_plan.name, addon_plan.price.cents, service.foreign_key, created_updated, created_updated])
    let service_attachment_uuid = uuid.v4();
    let service_attachment_name = create_service_attachment_name(addon_definition, addon_plan);
    service.name = service_attachment_name
    await insert_service_attachment(pg_pool, [service_attachment_uuid, service_attachment_name, service_uuid, app.id, true, created_updated, created_updated])
  } catch (e) {
    console.error("Error provisioning:", e);
    try {
      await addon_definition.unprovision(pg_pool, addon_definition.alamo_name, app.name, app.space, app.org, addon_plan, service)
    } catch (unprovision_error) {
      console.error("FATAL ERROR: Unable to rollback provisioning, we successfully created, failed to record, and successfuly deleted. WE HAVE A STRAGGLER! " + service.foreign_key)
      throw new common.InternalServerError("Internal Server Error")
    }
    console.error("Successfully rolled back provisioning due to insert service failure.  No stragglers. " + service.foreign_key)
    throw new common.InternalServerError("Internal Server Error")
  }
  service.service = service_uuid
  service.created = created_updated
  service.updated = created_updated
  return service
}

const delete_service_attachment = query.bind(query, fs.readFileSync('./sql/delete_service_attachment.sql').toString('utf8'), (r) => { return r; });
async function unprovision(addon_definition, pg_pool, app, addon_plan, service) {
  let unprovision_info = await addon_definition.unprovision(pg_pool, addon_definition.alamo_name, app.name, app.space, app.org, addon_plan, service)
  let service_attachment = await delete_service_attachment(pg_pool, [service.service, app.id])
  await delete_service(pg_pool, [service.service])
  return service
}

const select_service_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });
async function attach(addon_definition, pg_pool, target_app, addon_plan, service, owner) {
  let attachments = await select_service_attachments(pg_pool, [service.service])
  if(attachments.some((x) => { return x.app === target_app.id; })) {
    throw new common.ConflictError("This addon is already provisioned or attached on this app.")
  }
  let spec = await addon_definition.attach(pg_pool, target_app, addon_plan, service)
  let service_attachment_uuid = uuid.v4();
  let created_updated = new Date();
  let service_attachment = await insert_service_attachment(pg_pool, [service_attachment_uuid, create_service_attachment_name(addon_definition, addon_plan), service.service, target_app.id, owner, created_updated, created_updated])
  service_attachment[0].app_name = target_app.name
  service_attachment[0].space = target_app.space
  return service_attachment[0]
}

async function detach(addon_definition, pg_pool, app, addon_plan, service) {
  let attachments = await select_service_attachments(pg_pool, [service.service])
  if(attachments.length === 0) {
    throw new common.ConflictError("Unable to detach, this app does not have this addon attached.")
  }
  let spec = await addon_definition.detach(pg_pool, app, addon_plan, service)
  let service_attachment = await delete_service_attachment(pg_pool, [service.service, app.id])
  if(service_attachment.length === 0) {
    console.error(`ERROR: Delete operation failed to detach service ${service.service} from ${app.id}, more information below:\n`, attachments)
    throw new common.ConflictError(`Unable to detach, cannot find service ${service.service} attached to app ${app.id}`)
  }
  if(service_attachment.length > 1) {
    console.warn(`ERROR or WARNING: delete operation detached more than one service ${service.service} from ${app.id}, more information below:\n`, attachments, service_attachment)
  }
  service_attachment[0].app_name = app.name
  service_attachment[0].space = app.space
  return service_attachment[0]
}

function plans(addon_definition) {
  return addon_definition.plans.map(transform_plan.bind(null, addon_definition));
}

async function config_vars(addon_definition, pg_pool, service, space_name, app_name) {
  let foreign_id = service.foreign_key.split(':')[1];
  try {
    return common.alamo.service_config_vars(pg_pool, addon_definition.alamo_name, foreign_id, space_name, app_name)
  } catch (e) {
    console.log("Warning failed to decode:", e);
    return {};
  }
}

function begin_timers(addon_definition, pg_pool) {
  assert.ok(pg_pool, 'Begin timers called without pg_pool connector.')
  let fetch_plans = async () => { 
    let plans = await get_plans(addon_definition.alamo_name, pg_pool)
    if(addon_definition.transform_alamo_plans) {
      plans = addon_definition.transform_alamo_plans(plans)
    }
    addon_definition.plans = plans; 
  };
  setInterval(() => {
    fetch_plans().catch((e) => { console.error("Cannot fetch plans for:", addon_definition, e) });
  }, 10 * 60 * 1000);
  fetch_plans().catch((e) => { console.error("Cannot fetch plans for:", addon_definition, e) });
}

module.exports = {
  transform_plan,
  get_plans,
  info:info,
  plans,
  provision,
  unprovision,
  attach,
  detach,
  action:action,
  get_actions,
  begin_timers,
  transform_service,
  config_vars
};