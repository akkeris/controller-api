
const assert = require('assert')
const common = require('../common.js')
const addons = require('./addons-helper.js');
const formation = require('../formations.js');

function plans(service, plan) {
  return {
    "addon_service": {
      "id": service.id,
      "name": service.name
    },
    "created_at": "2016-08-09T12:00:00Z",
    "default": false,
    "description": plan.description,
    "human_name": plan.metadata && plan.metadata.human_name ? plan.metadata.human_name : plan.name,
    "id": plan.id,
    "installable_inside_private_network": plan.metadata ? plan.metadata.installable_inside_private_network : true,
    "installable_outside_private_network": plan.metadata ? plan.metadata.installable_inside_private_network : true,
    "name": service.name + ":" + plan.name,
    "key":plan.id,
    "price": {
      "cents": plan.metadata && plan.metadata.price ? plan.metadata.price.cents : 0,
      "unit": plan.metadata && plan.metadata.price ? plan.metadata.price.unit : "month",
      "contract": plan.metadata && plan.metadata.price && plan.metadata.price.contract ? plan.metadata.price.contract : false
    },
    "available_regions":service.regions,
    "compliance":plan.metadata && plan.metadata.compliance ? plan.metadata.compliance : [],
    "space_default": plan.metadata && plan.metadata.space_default ? plan.metadata.space_default : false,
    "state": plan.metadata && plan.metadata.state ? plan.metadata.state : "public",
    "updated_at": "2016-08-09T12:00:00Z",
    "attributes": plan.metadata && plan.metadata.attributes ? plan.metadata.attributes : {}
  };
}

function info(service) {
  return {
    "actions":[], // TODO: ??
    "available_regions":service.regions,
    "cli_plugin_name": service.short_name,
    "created_at": "2016-08-09T12:00:00Z",
    "description": service.description,
    "human_name": service.metadata && service.metadata.name ? service.metadata.name : service.name,
    "image_url": service.metadata ? service.metadata.image : null,
    "id": service.id,
    "name": service.name,
    "state": "ga", // TODO: ??
    "supports_multiple_installations": true,
    "supports_upgrading":service.plan_updateable,
    "supports_sharing": service.bindable ? true : false,
    "updated_at": "2016-08-09T12:00:00Z"
  };
}

async function provision(pg_pool, type, app_name, space_name, org_name, addon_plan, service_uuid) {
  let formations = await formation.list_types(pg_pool, app_name, space_name)
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  let response = await common.alamo.create_osb_service(pg_pool, type, service_uuid, addon_plan.addon_service.id, addon_plan.id, org_name, space_name, app_name)
  let results = await Promise.all(formations.map(async (form) => {
    return common.alamo.bind_service(pg_pool, space_name, common.alamo.app_name(app_name, form.type), type, service_uuid)
  }));
  let state = await common.alamo.get_osb_status(pg_pool, addon_plan.addon_service.id, addon_plan.id, service_uuid, space_name, app_name)
  if (state === "successful" || state === "succeeded") {
    state = "provisioned"
  } else if (state === "in progress") {
    state = "provisioning"
  } else {
    state = "deprovisioned"
  }
  return {foreign_key:type + ":" + service_uuid, config_vars:{}, state, reply:results, created:new Date()}
}

async function unprovision(pg_pool, type, app_name, space_name, org, addon_plan, service) {
  let spec = service.foreign_key.split(':');
  let formations = await formation.list_types(pg_pool, app_name, space_name)
  await Promise.all(formations.map(async (form) => await common.alamo.unbind_service(pg_pool, space_name, common.alamo.app_name(app_name, form.type), service.foreign_key)))
  await common.alamo.delete_osb_service(pg_pool, type, spec[1], addon_plan.id, org, space_name, app_name)
  return service.foreign_key
}

async function update(pg_pool, app, addon_plan, addon) {
  let spec = addon.foreign_key.split(':');
  assert.ok(spec.length === 2, 'Cannot find valid specification for foreign key')
  assert.ok(app.space_name, 'The space name could not be found on the app.')
  assert.ok(addon_plan.id, 'The addon plan id cannt be found')
  await common.alamo.update_osb_service(pg_pool, app.space_name, spec[1], addon_plan.addon_service.id, addon_plan.id)
  addon.state = "provisioning"
  addon.plan = addon_plan
  return addon
}

async function attach(pg_pool, app, addon_plan, service) {
  let specs = service.foreign_key.split(':');
  let formations = await formation.list_types(pg_pool, app.name, app.space)
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  await Promise.all(formations.map(async (form) => {
    return await common.alamo.bind_service(pg_pool, app.space, common.alamo.app_name(app.name, form.type), specs[0], specs[1])
  }))
  return service
}

async function detach(pg_pool, app, addon_plan, service) {
  let formations = await formation.list_types(pg_pool, app.name, app.space)
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  await Promise.all(formations.map(async (form) => {
    return await common.alamo.unbind_service(pg_pool, app.space, common.alamo.app_name(app.name, form.type), service.foreign_key)
  }))
  return service
}

async function get_state(pg_pool, addon_definition, plan_id, addon_id, app_uuid) {
  let app = await common.app_exists(pg_pool, app_uuid)
  // NEVER call common.addon_exists from this.
  let res = await common.alamo.get_osb_status(pg_pool, addon_definition.id, plan_id, addon_id, app.space_name, app.app_name)
  if (res.state === "successful" || res === "successful" || res === "succeeded" || res.state === "succeeded") {
    return "provisioned"
  } else if (res.state === "in progress" || res === "in progress") {
    return "provisioning"
  } else {
    return "deprovisioned"
  }
}

async function action(pg_pool, plan, service, app, action_id, req_url, payload, method) {
  return await common.alamo.osb_action(pg_pool, app.name, app.space, method, service.foreign_key, action_id, payload)
}

async function promote(pg_pool, app, addon_plan, service) {
  if(service.secondary_configvar_map_ids) {
    let [bindtype, bindname] = service.foreign_key.split(':')
    assert.ok(app.name !== '', 'The app object did not have a name')
    assert.ok(app.space !== '', 'The app object did not have a space')
    assert.ok(bindname !== '', 'The spec was invalid, the bind name was blank in promote')
    assert.ok(bindtype !== '', 'The spec was invalid, the bind type was blank in promote')
    assert.ok(typeof(service.secondary_configvar_map_ids) === 'string', 'The config var map ids was not a string!')
    assert.ok(service.primary !== true, 'Tried to promtoe an already primary addon! ' + service.service)
    await Promise.all(service.secondary_configvar_map_ids.split(',')
      .map((map_id) => common.alamo.delete_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, map_id)))
  }
}

async function demote(pg_pool, app, addon_plan, service) {
  let [bindtype, bindname] = service.foreign_key.split(':')
  assert.ok(bindname !== '', 'The spec was invalid, the bind name was blank in promote')
  assert.ok(bindtype !== '', 'The spec was invalid, the bind type was blank in promote')
  assert.ok(app.name !== '', 'The app object did not have a name')
  assert.ok(app.space !== '', 'The app object did not have a space')
  let prefix = service.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
  let existing_config_vars = await common.alamo.mapped_service_config_vars(pg_pool, app.space, app.name, bindname, bindtype)
  let map_ids = []
  map_ids.push((await common.alamo.create_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, "rename", '*', `${prefix}_`)).message)
  return map_ids
}


module.exports = async function (add_service, pg_pool) {
    let services = await common.alamo.osb_catalog(pg_pool)
    // if we do not have any available regions for any plans just go ahead and abandon hope.
    if (services.length === 0) {
      return
    }
    services.forEach((service) => {
      let addon_definition = {
        human_name:service.metadata && service.metadata.name ? service.metadata.name : service.name,
        short_name:service.name, 
        alamo_name:service.name,
        name:service.name,
        id:service.id,
        detach,
        attach,
        provision,
        unprovision,
        promote,
        demote,
        update,
      }
      add_service({
        promote:addons.promote.bind(null, addon_definition),
        demote:addons.demote.bind(null, addon_definition),
        config_vars:addons.config_vars.bind(null, addon_definition),
        update:addons.update.bind(null, addon_definition),
        info:info.bind(null, service), 
        plans:function() { return service.plans.map(plans.bind(null, service)) },
        provision:addons.provision.bind(null, addon_definition),
        unprovision:addons.unprovision.bind(null, addon_definition),
        detach:addons.detach.bind(null, addon_definition),
        attach:addons.attach.bind(null, addon_definition),
        action,
        get_actions:addons.get_actions.bind(null, null),
        get_state:get_state.bind(null, pg_pool, addon_definition),
        timers:{begin:addons.begin_timers.bind(null, null)}
      }, pg_pool)
    })
    
}