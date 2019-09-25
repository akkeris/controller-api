"use strict"

const addons = require('./addons-helper.js');
const assert = require('assert')
const crypto = require('crypto');
const common = require('../common.js');
const config = require('../config.js');
const formation = require('../formations.js');
const httph = require('../http_helper.js');
const uuid = require('uuid');

/*
  - Rationale:
  This file contains actions that are commonly performed for akkeris addon services,
  it should not be aware of the app controller, or concern itself with regional information
  but only about logic to transition business logic to regional api end points.
*/

module.exports = function(long_name, short_name, keyed_name, alamo_name, plan_price, description, actions, transform_alamo_plans, transform_appkit_plan, supports_multiple_installations) {
  async function provision(pg_pool, type, app_uuid, app_name, space_name, org_name, addon_plan) {
    let key = addon_plan.key;
    if(transform_appkit_plan) {
      key = transform_appkit_plan(addon_plan.key)
    }
    let formations = await common.formations_exists(pg_pool, app_uuid);
    if(formations.length === 0) {
      throw new common.NoFormationsFoundError()
    }
    let response = await common.alamo.create_service(pg_pool, type, key, org_name, space_name, app_name)
    let specs = response.spec.split(':');
    if(!specs[1] || specs[1] === '') {
      throw new common.WaitingForResourcesError()
    }
    if(specs[1].indexOf('?') > 0) {
      specs[1] = specs[1].substring(0, specs[1].indexOf('?'))
    }
    let config_service_vars = {};
    Object.keys(response).forEach((key) => {
      if(key !== 'spec') {
        config_service_vars[key] = response[key];
      }
    });
    let results = await Promise.all(formations.map(async (form) => {
      return common.alamo.bind_service(pg_pool, space_name, common.alamo.app_name(app_name, form.type), specs[0], specs[1])
    }));
    return {foreign_key:specs.join(':'), config_vars:config_service_vars, state:"provisioned", reply:results, created:new Date()}
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
    for(let key in existing_config_vars) {
      map_ids.push((await common.alamo.create_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, "rename", key, `${prefix}_${key}`)).message)
    }
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
      if ({}.hasOwnProperty.call(existing_config_vars, key)) {
        map_ids.push((await common.alamo.create_configvar_map(pg_pool, app.space, app.name, bindname, bindtype, "rename", key, `${prefix}_${key}`)).message)
      }
    }
    return map_ids
  }

  async function unprovision(pg_pool, type, app_uuid, app_name, space_name, org, addon_plan, service) {
    let spec = service.foreign_key.split(':');
    let formations = await await common.formations_exists(pg_pool, app_uuid);
    await Promise.all(formations.map(async (form) => await common.alamo.unbind_service(pg_pool, space_name, common.alamo.app_name(app_name, form.type), service.foreign_key)))
    await common.alamo.delete_service(pg_pool, type, spec[1], space_name, app_name)
    return service.foreign_key
  }

  async function attach(pg_pool, app, addon_plan, service) {
    let specs = service.foreign_key.split(':');
    // TODO: what is app? get rid of this.
    let formations = await common.formations_exists(pg_pool, app.id);
    if(formations.length === 0) {
      throw new common.NoFormationsFoundError()
    }
    await Promise.all(formations.map(async (form) => {
      return await common.alamo.bind_service(pg_pool, app.space, common.alamo.app_name(app.name, form.type), specs[0], specs[1])
    }))
    return service
  }

  async function detach(pg_pool, app, addon_plan, service) {
    // TODO: what is app? get rid of this.
    let formations = await common.formations_exists(pg_pool, app.id);
    if(formations.length === 0) {
      throw new common.NoFormationsFoundError()
    }
    await Promise.all(formations.map(async (form) => {
      return await common.alamo.unbind_service(pg_pool, app.space, common.alamo.app_name(app.name, form.type), service.foreign_key)
    }))
    return service
  }

  function get_actions() {
    if(actions && actions["info"]) {
      return actions["info"];
    } else {
      return null;
    }
  }

  async function action(pg_pool, plan, service, app, action_id, req_url, payload) {
    if(actions && actions[action_id]) {
      return await actions[action_id].exec(pg_pool, plan, service, app, action_id, req_url, payload)
    } else {
      throw new common.NotFoundError("No such action found.")
    }
  }

  return async function (pg_pool) {
    let plans = await common.alamo.service_plans(pg_pool, alamo_name)
    // if we do not have any available regions for any plans just go ahead and abandon hope.
    if (plans.length === 0) {
      return [];
    }
    const addon_definition = {
      human_name:long_name,
      short_name,
      name:keyed_name,
      alamo_name,
      id:uuid.unparse(crypto.createHash('sha256').update(keyed_name).digest(), 16),
      plan_price,
      plans,
      provision,
      unprovision,
      action,
      get_actions,
      attach,
      detach,
      description,
      transform_alamo_plans,
      promote,
      demote,
      remap,
      supports_multiple_installations,
    };

    await addons.load_plans(addon_definition, pg_pool);

    if(addon_definition.transform_alamo_plans) {
      addon_definition.plans = addon_definition.transform_alamo_plans(addon_definition.plans)
    }


    return [{
      promote:addons.promote.bind(null, addon_definition),
      demote:addons.demote.bind(null, addon_definition),
      remap:addons.remap.bind(null, addon_definition),
      config_vars:addons.config_vars.bind(null, addon_definition),
      info:addons.info.bind(null, addon_definition), 
      plans:addons.plans.bind(null, addon_definition),
      provision:addons.provision.bind(null, addon_definition),
      unprovision:addons.unprovision.bind(null, addon_definition),
      detach:addons.detach.bind(null, addon_definition),
      attach:addons.attach.bind(null, addon_definition),
      action:addons.action.bind(null, addon_definition),
      get_state:() => "provisioned",
      get_actions:addons.get_actions.bind(null, addon_definition),
      update:() => { throw new common.ConflictError("Cannot upgrade this plan as changes are unsupported") },
    }]
  }
}
