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
      "unit": "month",
      "contract": false,
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
    "image_url": null,
    "id": addon_definition.id,
    "name": addon_definition.name,
    "state": "ga",
    "available_regions":available_regions,
    "supports_upgrading": false,
    "supports_multiple_installations": (typeof(addon_definition.supports_multiple_installations) === 'undefined') ? 
                                          true : addon_definition.supports_multiple_installations,
    "supports_sharing": typeof(addon_definition.sharable) === 'undefined' ? true : addon_definition.sharable,
    "updated_at": "2016-08-09T12:00:00Z"
  };
}

async function get_plans(type, pg_pool) {
  assert.ok(pg_pool, 'get_plans called without pg_pool')
  return await common.alamo.service_plans(pg_pool, type)
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

async function config_vars(addon_definition, pg_pool, service, space_name, app_name) {
  let foreign_id = service.foreign_key.split(':')[1];
  return await common.alamo.mapped_service_config_vars(pg_pool, space_name, app_name, foreign_id, addon_definition.alamo_name)
}

const select_services_by_app_and_type = query.bind(query, fs.readFileSync('./sql/select_services_by_app_and_type.sql').toString('utf8'), (r) => { return r; });
const insert_service = query.bind(query, fs.readFileSync('./sql/insert_service.sql').toString('utf8'), (r) => { return r; });
const insert_service_attachment = query.bind(query, fs.readFileSync('./sql/insert_service_attachment.sql').toString('utf8'), (r) => { return r; });
const delete_service = query.bind(query, fs.readFileSync('./sql/delete_service.sql').toString('utf8'), (r) => { return r; });
async function provision(addon_definition, pg_pool, app, addon_plan, addon_attachment_name) {
  let service_uuid = uuid.v4()
  let service = await addon_definition.provision(pg_pool, addon_definition.alamo_name, app.id, app.name, app.space, app.org, addon_plan, service_uuid)
  let created_updated = new Date()
  try {
    await insert_service(pg_pool, [service_uuid, addon_definition.id, addon_definition.name, addon_plan.id, addon_plan.name, addon_plan.price.cents, service.foreign_key, created_updated, created_updated])
    let service_attachment_uuid = uuid.v4();
    addon_attachment_name = addon_attachment_name || create_service_attachment_name(addon_definition, addon_plan);
    service.name = addon_attachment_name
    service.service_attachment = service_attachment_uuid
    await insert_service_attachment(pg_pool, [service_attachment_uuid, addon_attachment_name, service_uuid, app.id, true, addon_plan.primary, created_updated, created_updated])
    if(!addon_plan.primary) {
      let map_ids = await addon_definition.demote(pg_pool, app, addon_plan, service)
      await update_service_attachment(pg_pool, [service.service_attachment, false, map_ids.join(',')])
    }
    try {
      let addon_service = common.service_by_id_or_name(addon_definition.id)
      service.config_vars = await addon_service.config_vars(pg_pool, service, app.space, app.name)
    } catch (e) {
      service.config_vars = {}
    }

  } catch (e) {
    console.error("Error provisioning:", e);
    try {
      await addon_definition.unprovision(pg_pool, addon_definition.alamo_name, app.id, app.name, app.space, app.org, addon_plan, service)
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
  if(addon_plan.primary === true) {
    // if were primary, run demote to find a new primary, if this
    // is the only addon of its type then this is a no-op. This will
    // give us new mappings that'll be removed once we detach/unbind.
    await demote(addon_definition, pg_pool, app, addon_plan, service)
  }

  let unprovision_info = await addon_definition.unprovision(pg_pool, addon_definition.alamo_name, app.id, app.name, app.space, app.org, addon_plan, service)
  let service_attachment = await delete_service_attachment(pg_pool, [service.service, app.id])
  await delete_service(pg_pool, [service.service])
  return service
}

const update_service = query.bind(query, fs.readFileSync('./sql/update_service.sql').toString('utf8'), (r) => { return r; });
async function update(addon_definition, pg_pool, app, addon_plan, addon) {
  assert.ok(addon.service, 'No service was found')
  assert.ok(addon_plan.id, 'No addon plan id was found')
  assert.ok(addon_plan.name, 'No addon plan name was found')
  let new_addon = await addon_definition.update(pg_pool, app, addon_plan, addon)
  await update_service(pg_pool, [addon.service, addon_plan.id, addon_plan.name, addon_plan.price.cents, new_addon.foreign_key])
  return new_addon
}

const select_service_attachment = query.bind(query, fs.readFileSync('./sql/select_service_attachment.sql').toString('utf8'), (r) => { return r; });
const update_service_attachment_name = query.bind(query, fs.readFileSync('./sql/update_service_attachment_name.sql').toString('utf8'), (r) => { return r; });
async function remap(addon_definition, pg_pool, app, addon, new_name) {
  assert.ok(app.id && app.id !== '', 'The apps uuid was not found.')
  assert.ok(addon && addon.service, 'The addon service to be promoted was not found.')
  assert.ok(addon.service_attachment, 'Unable to find service attachment id for addon.')
  if(addon.primary === false) {
    let attachment = await select_service_attachment(pg_pool, [app.id, addon.service_attachment])
    assert.ok(attachment.length === 1, `Unable to find attachment for addon (${app.id}).`)
    addon.secondary_configvar_map_ids = attachment[0].secondary_configvar_map_ids
    let map_ids = await addon_definition.remap(pg_pool, app, addon, new_name)
    await update_service_attachment(pg_pool, [addon.service_attachment, false, map_ids.join(',')])
  }
  await update_service_attachment_name(pg_pool, [app.id, addon.service_attachment, new_name.toLowerCase()])
}

const update_service_attachment = query.bind(query, fs.readFileSync('./sql/update_service_attachment.sql').toString('utf8'), (r) => { return r; });
async function promote(addon_definition, pg_pool, app, addon_plan, addon) {
  assert.ok(app.id && app.id !== '', 'The apps uuid was not found.')
  assert.ok(addon_plan.addon_service.id, 'The addon service type could not be determined.')
  assert.ok(addon && addon.service, 'The addon service to be promoted was not found.')
  let addons_of_type = await select_services_by_app_and_type(pg_pool, [app.id, addon_plan.addon_service.id])
  await Promise.all(addons_of_type.map(async (addon_of_type) => {
    if(addon_of_type.primary === true && addon_of_type.service !== addon.service) {
      let map_ids = await addon_definition.demote(pg_pool, app, addon_plan, addon_of_type)
      return update_service_attachment(pg_pool, [addon_of_type.service_attachment, false, map_ids.join(',')])
    } else if (addon_of_type.primary === false && addon_of_type.service === addon.service) {
      await addon_definition.promote(pg_pool, app, addon_plan, addon_of_type)
      return update_service_attachment(pg_pool, [addon_of_type.service_attachment, true, null])
    } else if(addon_of_type.primary == true && addon_of_type.service === addon.service) {
      console.log("Error: attempting to promote service thats already primary: ", addon.service)
    }
  }))
}

async function demote(addon_definition, pg_pool, app, addon_plan, addon) {
  assert.ok(app.id && app.id !== '', 'The apps uuid was not found.')
  assert.ok(addon_plan.addon_service.id, 'The addon service type could not be determined.')
  assert.ok(addon && addon.service, 'The addon service to be promoted was not found.')
  let addons_of_type = await select_services_by_app_and_type(pg_pool, [app.id, addon_plan.addon_service.id])
  if (addon.primary === true && addons_of_type.length > 1) {
    let new_primary = addons_of_type.filter((x) => x.service !== addon.service)[0]
    assert.ok(new_primary, `Cannot find a new primary for ${app.id}:${addon_plan.addon_service.id}:${addon.service}`)
    assert.ok(new_primary.primary === false, `The new primary randomly picked, somehow was also primary! ${new_primary.service}:${addon.service}`)
    // update the new primary, kill off the mappings in the region api
    // then mark it as primary in the database, and remove map ids
    await addon_definition.promote(pg_pool, app, addon_plan, new_primary)
    await update_service_attachment(pg_pool, [new_primary.service_attachment, true, null])
    // add mappings for our addon
    return await addon_definition.demote(pg_pool, app, addon_plan, addon)
  } else {
    return []
  }
}

const select_service_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });
async function attach(addon_definition, pg_pool, target_app, addon_plan, service, owner, addon_attachment_name) {
  let attachments = await select_service_attachments(pg_pool, [service.service])
  if(addon_attachment_name && attachments.some((x) => { return x.name.toLowerCase() === addon_attachment_name.toLowerCase() })) {
    throw new common.ConflictError("This addon attachment name already exists for this service.")
  }
  if(attachments.some((x) => { return x.app === target_app.id; })) {
    throw new common.ConflictError("This addon is already provisioned or attached on this app.")
  }
  assert.ok(service.foreign_key, 'The service did not contain a foreign id.')
  let spec = await addon_definition.attach(pg_pool, target_app, addon_plan, service)
  let service_attachment_uuid = uuid.v4();
  let created_updated = new Date();
  addon_attachment_name = addon_attachment_name || create_service_attachment_name(addon_definition, addon_plan)
  let service_attachment = await insert_service_attachment(pg_pool, [service_attachment_uuid, addon_attachment_name, service.service, target_app.id, owner, addon_plan.primary, created_updated, created_updated])
  service_attachment[0].app_name = target_app.name
  service_attachment[0].space = target_app.space
  service_attachment[0].foreign_key = service.foreign_key

  if(!addon_plan.primary) {
    let map_ids = await addon_definition.demote(pg_pool, target_app, addon_plan, service_attachment[0])
    await update_service_attachment(pg_pool, [service_attachment[0].service_attachment, false, map_ids.join(',')])
  }
  // this must occur at the end incase the attach is secondary we need it to remove the proper map ids.
  service_attachment[0].config_vars = await config_vars(addon_definition, pg_pool, service, target_app.space, target_app.name)
  
  return service_attachment[0]
}

async function detach(addon_definition, pg_pool, app, addon_plan, service) {
  let attachments = await select_service_attachments(pg_pool, [service.service])
  if(attachments.length === 0) {
    throw new common.ConflictError("Unable to detach, this app does not have this addon attached.")
  }
  if(addon_plan.primary === true) {
    // if were primary, run demote to find a new primary, if this
    // is the only addon of its type then this is a no-op. This will
    // give us new mappings that'll be removed once we detach/unbind.
    await demote(addon_definition, pg_pool, app, addon_plan, service)
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

async function load_plans(addon_definition, pg_pool) {
  assert.ok(pg_pool, 'Begin timers called without pg_pool connector.')
  let plans = await get_plans(addon_definition.alamo_name, pg_pool)
  if(addon_definition.transform_alamo_plans) {
    plans = addon_definition.transform_alamo_plans(plans)
  }
  addon_definition.plans = plans;
}

module.exports = {
  transform_plan,
  get_plans,
  info,
  plans,
  provision,
  unprovision,
  attach,
  detach,
  action,
  get_actions,
  load_plans,
  config_vars,
  promote,
  demote,
  update,
  remap,
};