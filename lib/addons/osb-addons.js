
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
    "cli_plugin_name": service.short_name || service.name,
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

async function get_state(pg_pool, addon_definition, plan_id, addon_id, app_uuid) {
  let app = await common.app_exists(pg_pool, app_uuid)
  // NEVER call common.addon_exists from this.
  let res = await common.alamo.get_osb_status(pg_pool, addon_definition.id, plan_id, addon_id, app.space_name, app.app_name)
  if (res.state === "succeeded") {
    return {"state":"provisioned", "state_description":res.description}
  } else if (res.state === "in progress") {
    return {"state":"provisioning", "state_description":res.description}
  } else {
    return {"state":"deprovisioned", "state_description":res.description}
  }
}

async function provision(pg_pool, type, app_uuid, app_name, space_name, org_name, addon_plan, addon_id) {
  let formations = await common.formations_exists(pg_pool, app_uuid);
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  await common.alamo.create_osb_service(pg_pool, type, addon_plan.addon_service.id, addon_plan.id, addon_id, org_name, space_name, app_name);
  try {
    await common.alamo.create_osb_bindings(pg_pool, addon_plan.addon_service.id, addon_plan.id, addon_id, space_name, app_name);
  } catch (e) {
    console.error(`Warning: Unable to create osb binding for ${app_uuid} and addon ${addon_id}: ${JSON.stringify(e)}`);
    console.error(`         this may not be a serious issue as some brokers do not support binding operations.`);
  }
  let results = await Promise.all(formations.map(async (form) => {
    return common.alamo.bind_service(pg_pool, space_name, common.alamo.app_name(app_name, form.type), type, addon_id);
  }));
  let app = await common.app_exists(pg_pool, `${app_name}-${space_name}`);
  let status = await get_state(pg_pool, addon_plan.addon_service, addon_plan.id, addon_id, app.app_uuid);
  return Object.assign(status, {foreign_key:type + ":" + addon_id, config_vars:{}, reply:results, created:new Date()});
}

async function unprovision(pg_pool, type, app_uuid, app_name, space_name, org, addon_plan, service) {
  let formations = await await common.formations_exists(pg_pool, app_uuid);
  let spec = service.foreign_key.split(':');
  await Promise.all(formations.map(async (form) => await common.alamo.unbind_service(pg_pool, space_name, common.alamo.app_name(app_name, form.type), service.foreign_key)));
  try {
    await common.alamo.delete_osb_bindings(pg_pool, spec[1], addon_plan.id, addon_plan.addon_service.id, space_name, app_name);
  } catch (e) {
    console.error(`Warning: Unable to remove osb binding for ${app_uuid} and addon ${JSON.stringify(service)}: ${JSON.stringify(e)}`);
    console.error(`         this may not be a serious issue as some brokers do not support binding operations.`);
  }
  await common.alamo.delete_osb_service(pg_pool, type, spec[1], addon_plan.id, org, space_name, app_name);
  return service.foreign_key
}

async function update(pg_pool, app, addon_plan, addon) {
  let [addon_service_name, addon_id] = addon.foreign_key.split(':');
  assert.ok(addon_service_name, 'Cannot find valid specification for foreign key')
  assert.ok(addon_id, 'Cannot find valid specification for foreign key')
  assert.ok(app.space_name, 'The space name could not be found on the app.')
  assert.ok(addon_plan.id, 'The addon plan id cannt be found')
  await common.alamo.update_osb_service(pg_pool, app.space_name, addon_plan.addon_service.id, addon_plan.id, addon_id)
  addon.state = "provisioning"
  addon.plan = addon_plan
  return addon
}

async function attach(pg_pool, app, addon_plan, service) {
  let [addon_service_name, addon_id] = service.foreign_key.split(':');
  // TODO: what is app? get rid of this.
  let formations = await common.formations_exists(pg_pool, app.id);
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  try {
    await common.alamo.create_osb_bindings(pg_pool, addon_plan.addon_service.id, addon_plan.id, addon_id, app.space_name, app.name);
  } catch (e) {
    console.error(`Warning: Unable to create osb binding during attach for ${app.id} and addon ${JSON.stringify(service)}: ${JSON.stringify(e)}`);
    console.error(`         this may not be a serious issue as some brokers do not support binding operations.`);
  }
  await Promise.all(formations.map(async (form) => {
    return await common.alamo.bind_service(pg_pool, app.space, common.alamo.app_name(app.name, form.type), addon_service_name, addon_id)
  }))
  return service
}

async function detach(pg_pool, app, addon_plan, service) {
  let [addon_service_name, addon_id] = service.foreign_key.split(':');
  // TODO: what is app? get rid of this.
  let formations = await common.formations_exists(pg_pool, app.id);
  if(formations.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  try {
    await common.alamo.delete_osb_bindings(pg_pool, addon_plan.addon_service.id, addon_plan.id, addon_id, app.space_name, app.name);
  } catch (e) {
    console.error(`Warning: Unable to create osb binding during attach for ${app.id} and addon ${JSON.stringify(service)}: ${JSON.stringify(e)}`);
    console.error(`         this may not be a serious issue as some brokers do not support binding operations.`);
  }
  await Promise.all(formations.map(async (form) => {
    return await common.alamo.unbind_service(pg_pool, app.space, common.alamo.app_name(app.name, form.type), service.foreign_key)
  }))
  return service
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
  let prefixes = service.name.split('-');
  let prefix = prefixes.length > 2 ? 
    service.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase() : 
    service.name.replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
  let existing_config_vars = await common.alamo.mapped_service_config_vars(pg_pool, app.space, app.name, bindname, bindtype)
  let map_ids = []
  map_ids.push((await common.alamo.create_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, "rename", '*', `${prefix}_`)).message)
  return map_ids
}

async function remap(pg_pool, app, service, new_name) {
  let [bindtype, bindname] = service.foreign_key.split(':')
  assert.ok(bindname !== '', 'The spec was invalid, the bind name was blank in promote')
  assert.ok(bindtype !== '', 'The spec was invalid, the bind type was blank in promote')
  assert.ok(app.name !== '', 'The app object did not have a name')
  assert.ok(app.space !== '', 'The app object did not have a space')
  if(service.secondary_configvar_map_ids) {
    await Promise.all(service.secondary_configvar_map_ids.split(',')
      .map(async (map_id) => await common.alamo.delete_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, map_id)))
  }
  let prefixes = new_name.split('-');
  let prefix = prefixes.length > 2 ? 
    new_name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase() : 
    new_name.replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
  let existing_config_vars = await common.alamo.mapped_service_config_vars(pg_pool, app.space, app.name, bindname, bindtype)
  let map_ids = []
  for(let key in existing_config_vars) {
    map_ids.push((await common.alamo.create_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, "rename", key, `${prefix}_${key}`)).message)
  }
  return map_ids
}


module.exports = async function (pg_pool) {
  let services = await common.alamo.osb_catalog(pg_pool)
  return services.map((service) => {
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
      remap
    }
    return {
      promote:addons.promote.bind(null, addon_definition),
      demote:addons.demote.bind(null, addon_definition),
      remap:addons.remap.bind(null, addon_definition),
      config_vars:addons.config_vars.bind(null, addon_definition),
      update:addons.update.bind(null, addon_definition),
      info:info.bind(null, service), 
      plans:() => service.plans.map(plans.bind(null, service)),
      provision:addons.provision.bind(null, addon_definition),
      unprovision:addons.unprovision.bind(null, addon_definition),
      detach:addons.detach.bind(null, addon_definition),
      attach:addons.attach.bind(null, addon_definition),
      action,
      get_actions:addons.get_actions.bind(null, null),
      get_state:get_state.bind(null, pg_pool, addon_definition),
    }
  })   
}