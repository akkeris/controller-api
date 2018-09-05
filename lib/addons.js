
const addon_services = require('./addon-services.js')
const assert = require('assert')
const config = require('./config.js')
const common = require('./common.js')
const fs = require('fs')
const formation = require('./formations.js')
const httph = require('./http_helper.js')
const lifecycle = require('./lifecycle.js')
const query = require('./query.js')

const select_addon = query.bind(query, fs.readFileSync('./sql/select_service.sql').toString('utf8'), (r) => { return r; });
const select_addons = query.bind(query, fs.readFileSync('./sql/select_services.sql').toString('utf8'), (r) => { return r; });
const select_addon_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });
const select_addon_attached_apps = query.bind(query, fs.readFileSync('./sql/select_service_attached_apps.sql').toString('utf8'), (r) => { return r; });

function transform_addon(app, addon_definition, addon_plan, service) {
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
    "primary": service.primary,
    "provider_id": "alamo",
    "updated_at": (new Date(service.updated)).toISOString(),
    "web_url": `${config.appkit_ui_url}/#/apps/${app.name}-${app.space}`
  };
}

async function can_remove_addons_by_app(pg_pool, app_uuid) {
  return !(await select_addons(pg_pool, [app_uuid])).some((addon) => {
    // for some reason counts come out of postgres as strings not ints.
    // lets double check this before we 'cast'
    if(typeof(addon.attachments) === 'string') {
      addon.attachments = parseInt(addon.attachments, 10);
    }
    return addon.owned && addon.attachments > 1
  });
}

async function addon_exists(pg_pool, addon_id, app_uuid) {
  let addons = await select_addon(pg_pool, [addon_id, app_uuid]);
  if(addons.length === 0) {
    throw new common.NotFoundError(`The specified service ${addon_id} was not found.`)
  }
  let addon_service = addon_services.service_by_id_or_name(addons[0].addon);
  let plan = addon_services.plan_by_id_or_name(addons[0].plan);
  assert.ok(addon_service, "The specified addon does not exist.");
  assert.ok(plan, "The specified addon plan does not exist.");
  return Object.assign(addons[0],{addon_service, plan})
}

async function addons_create(pg_pool, app_uuid, app_name, space_name, space_tags, org, plan, user) {
  let addon_service = null;
  try {
    assert.ok(plan, 'A plan was not provided in the request.');
    plan = addon_services.plan_by_id_or_name(plan);
    assert.ok(plan, 'The specified plan could not be found.');
    assert.ok(plan.state !== 'shutdown', 'The specified plan can no longer be created, as its been deprecated.');
    addon_service = addon_services.service_by_id_or_name(plan.addon_service.id);
    assert.ok(addon_service, 'The specified addon service could not be found.');
    space_tags = space_tags.split(',').map((x) => x.trim());
    assert.ok(!plan.compliance || plan.compliance.filter((compliance) => { return space_tags.indexOf('compliance=' + compliance) !== -1 }).length === plan.compliance.length,
      'The specified addon may not be attached to this app.  It requires these necessary compliances in the space: ' + (plan.compliance ? plan.compliance.join(',') : []));
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }

  // check to ensure region (specified implicitly by space_name) allows for the specified plan.
  let app = {id:app_uuid, name:app_name, space:space_name, org:org}
  let region = await common.alamo.region_name_by_space(pg_pool, space_name)
  if(plan.available_regions.indexOf(region) === -1) {
    throw new common.ConflictError('The specified addon or plan is not available in this spaces region.')
  }

  // check to ensure it allows multiple installs if it already exits.
  let proposed_service = addon_service.info()
  let existing_addons = await select_addons(pg_pool, [app_uuid])
  let existing_installation = existing_addons.filter((s) => { return plan.addon_service.id === s.addon }).length > 0
  if(proposed_service.supports_multiple_installations === false && existing_installation)
  {
    throw new common.ConflictError("This addon is already created and attached to this application and cannot be used twice.")
  }

  let service = null;
  try {
    service = await addon_service.provision(pg_pool, app, Object.assign(plan, {"primary":!existing_installation}));
  } catch (err) {
    if(err instanceof common.NoFormationsFoundError) {
      // create a web formation if non exists.
      await formation.create_dyno(pg_pool, app_uuid, app_name, space_name, 'web', null, 1, config.dyno_default_size, config.default_port, null);
      // try again.
      service = await addon_service.provision(pg_pool, app, Object.assign(plan, {"primary":!existing_installation}));
    } else if(!(err instanceof common.WaitingForResourcesError)) {
      console.error("ERROR FATAL: Unexpectedly we were unable to create the necessary infrastructure, please contact your local maytag man (or woman).")
      console.error(err.message)
      console.error(err.stack)
      throw new common.InternalServerError(`Unexpectedly we were unable to create the necessary infrastructure, please contact your local maytag man (or woman).`)
    } else {
      throw err
    }
  }
  if(space_tags.indexOf('compliance=socs') > -1) {
    service.config_vars = common.socs(service.config_vars);
  }
  service.primary = !existing_installation
  setTimeout(() => {
    common.notify_hooks(pg_pool, app_uuid, 'addon_change', JSON.stringify({
      'action':'addon_change',
      'app':{
        'name':app_name,
        'id':app_uuid
      },
      'space':{
        'name':space_name
      },
      'change':'create',
      'changes':[
        transform_addon(app, addon_service.info(), plan, service)
      ]
    }), user ? user : "System");
    lifecycle.restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org, 'Attached ' + plan.addon_service.name).catch((err) => { /* do nothing */ });
  }, 10)
  return transform_addon(app, addon_service.info(), plan, service);
}

async function http_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  let payload = await httph.buffer_json(req);
  httph.created_response(res, 
    JSON.stringify(await addons_create(pg_pool, app.app_uuid, app.app_name, app.space_name, space.tags, app.org_name, payload.plan, req.headers['x-username'])));
}

async function addons_list(pg_pool, app_uuid, app_name, space_name, org_name) {
  let addons = await select_addons(pg_pool, [app_uuid]);
  let app = {id:app_uuid, name:app_name, space:space_name, org:org_name};
  return addons.map((addon) => {
    try {
      let addon_service = addon_services.service_by_id_or_name(addon.addon).info();
      let plan = addon_services.plan_by_id_or_name(addon.plan);
      assert.ok(addon_service, 'The specified addon does not exist.');
      assert.ok(plan, 'The specified addon plan does not exist.');
      return transform_addon(app, addon_service, plan, addon);
    } catch (e) {
      console.log('Unable to fetch addon or plan');
      console.log(e.message)
      console.log(e.stack)
      return {}
    }
  });
}

async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key);
  return httph.ok_response(res, 
    JSON.stringify(await addons_list(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name)));
}

async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let addon = await addon_exists(pg_pool, addon_id, app.app_uuid)
  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name};
  addon.config_vars = await addon.addon_service.config_vars(pg_pool, addon, app.space_name, app.app_name);
  if(app.space_tags.indexOf('compliance=socs') !== -1) {
    addon.config_vars = common.socs(addon.config_vars)
  }
  let results = await select_addon_attached_apps(pg_pool, [addon_id]);
  let apps = results.map((app) => {return {"id":app.app, "name":`${app.name}-${app.space}`, "owner":app.owned}});
  apps.sort((a,b) =>  ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)) ); 
  let transformed_service = transform_addon(app_obj, addon.addon_service.info(), addon.plan, addon);
  transformed_service.attached_to = apps;
  return httph.ok_response(res, JSON.stringify(transformed_service));
}

async function http_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let payload = await httph.buffer_json(req);
  let addon = await addon_exists(pg_pool, addon_id, app.app_uuid)
  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name};
  let redeploy = false

  if(payload.primary === true && addon.primary === false) {
    await addon.addon_service.promote(pg_pool, app_obj, Object.assign(addon.plan, {"primary":addon.primary}), addon)
    redeploy = true
  }
  if(payload.primary === false && addon.primary === true) {
    throw new common.ConflictError('Unable to demote (make this addon not the primary addon), you must promote another addon to demote this addon.')
  }

  addon.config_vars = await addon.addon_service.config_vars(pg_pool, addon, app.space_name, app.app_name);
  if(app.space_tags.indexOf('compliance=socs') !== -1) {
    addon.config_vars = common.socs(addon.config_vars)
  }
  let results = await select_addon_attached_apps(pg_pool, [addon_id]);
  let apps = results.map((app) => {return {"id":app.app, "name":`${app.name}-${app.space}`, "owner":app.owned}});
  apps.sort((a,b) =>  ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)) ); 
  let transformed_service = transform_addon(app_obj, addon.addon_service.info(), addon.plan, addon);
  transformed_service.attached_to = apps;

  if(redeploy) {
    setTimeout(() => {
      common.notify_hooks(pg_pool, app.app_uuid, 'addon_change', JSON.stringify({
        'action':'addon_change',
        'app':{
          'name':app.app_name,
          'id':app.app_uuid
        },
        'space':{
          'name':app.space_name
        },
        'change':'promote',
        'changes':[
          transform_addon(app, addon.addon_service.info(), addon.plan, addon)
        ]
      }), req.headers['x-username'] ? req.headers['x-username'] : "System");
      lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Updated ' + addon.name).catch((err) => { /* do nothing */ });
    }, 10)
  }
  return httph.ok_response(res, JSON.stringify(transformed_service));
}

async function http_actions(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_id = httph.second_match(req.url, regex)
  let action_id = httph.third_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let addon = await addon_exists(pg_pool, addon_id, app.app_uuid)
  let payload = {}
  try { payload = await httph.buffer_json(req) } catch(e) { /* do nothing */ }
  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name};
  let action_result = await addon.addon_service.action(pg_pool, addon.plan, addon, app_obj, action_id, req.url, payload);
  return httph.ok_response(res, JSON.stringify(action_result));
}

async function http_delete(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_id = httph.second_match(req.url, regex)
  let action_id = httph.third_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)

  if(!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username']) && 
      (space.tags.indexOf('compliance=socs') > -1 || space.tags.indexOf('compliance=prod') > -1) ) 
  {
    throw new common.NotAllowedError("addons can only be destroyed by administrators on this app.")
  }

  let addon = await addon_exists(pg_pool, addon_id, app.app_uuid)
  if(addon.attachments > 1) {
    throw new common.ConflictError('This addon cannot be removed as its attached to other apps.')
  }

  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name}
  let result = await addon.addon_service.unprovision(pg_pool, app_obj, Object.assign(addon.plan, {"primary":addon.primary}), addon)

  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'addon_change', JSON.stringify({
      'action':'addon_change',
      'app':{
        'name':app.app_name,
        'id':app.app_uuid
      },
      'space':{
        'name':app.space_name
      },
      'change':'delete',
      'changes':[
        transform_addon(app_obj, addon.addon_service.info(), addon.plan, addon)
      ]
    }), req.headers['x-username']);
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Dettached ' + addon.plan.addon_service.name).catch((err) => { /* do nothing */ });
  }, 10);
  return httph.ok_response(res, JSON.stringify(transform_addon(app_obj, addon.addon_service.info(), addon.plan, addon)));
}

async function delete_by_app(pg_pool, app_uuid, app_name, space_name, org, user) {
  let addons = await select_addons(pg_pool, [app_uuid]);
  let app = { id:app_uuid, name:app_name, space:space_name, org:org };
  // TODO: Clean this up, we should have attachments in a seperate removal.
  let deleted_addons = []; // note these are NOT detached addons! but those permenantly removed!
  let detached_addons = []; // note these are detached addons. not those that are removed.

  // Remove attachments
  let addon_attachments = await select_addon_attachments(pg_pool, [app_uuid]);
  await Promise.all(addon_attachments.map(async (addon) => {
    let addon_service = addon_services.service_by_id_or_name(addon.addon);
    let plan =  addon_services.plan_by_id_or_name(addon.plan);
    detached_addons.push(transform_addon(app, addon_service.info(), plan, addon));
    return await addon_service.detach(pg_pool, app, Object.assign(plan, {"primary":addon.primary}), addon)
  }))

  // Remove addons
  let results = await Promise.all(addons.map(async (addon) => {
    let addon_service = addon_services.service_by_id_or_name(addon.addon);
    let plan = addon_services.plan_by_id_or_name(addon.plan);
    // for some reason counts come out of postgres as strings not ints.
    // lets double check this before we 'cast'
    if(typeof(addon.attachments) === 'string') {
      addon.attachments = parseInt(addon.attachments, 10);
    }
    if(addon.owned) {
      deleted_addons.push(transform_addon(app, addon_service.info(), plan, addon));
      return await addon_service.unprovision(pg_pool, app, Object.assign(plan, {"primary":addon.primary}), addon);
    } else {
      console.error("ERROR: Unable to remove addon as its not owned, yet somehow was requested to be removed.")
      console.error(addon)
    }
  }))
  if(deleted_addons.length > 0) {
    setTimeout(() => {
      common.notify_hooks(pg_pool, app_uuid, 'addon_change', JSON.stringify({
        'action':'addon_change',
        'app':{
          'name':app_name,
          'id':app_uuid
        },
        'space':{
          'name':space_name
        },
        'change':'delete',
        'changes':deleted_addons
      }), user ? user : "System");
    }, 10);
  }
  if(detached_addons.length > 0) {
    setTimeout(() => {
      common.notify_hooks(pg_pool, app_uuid, 'addon_change', JSON.stringify({
        'action':'addon_change',
        'app':{
          'name':app_name,
          'id':app_uuid
        },
        'space':{
          'name':space_name
        },
        'change':'detach',
        'changes':detached_addons
      }), user ? user : "System");
    }, 10)
  }
  return results
}

async function service_config_vars(pg_pool, app_uuid, space_name, app_name) {
  let addons = (await select_addons(pg_pool, [app_uuid])).concat(await select_addon_attachments(pg_pool, [app_uuid]));
  let data_return = {};
  for(let i=0; i < addons.length; i++) {
    try {
      let addon_service = addon_services.service_by_id_or_name(addons[i].addon);
      data_return = Object.assign(data_return, await addon_service.config_vars(pg_pool, addons[i], space_name, app_name));
    } catch (e) {
      console.error('Error getting addon config vars:', e)
    }
  }
  return data_return;
}

module.exports = {
  addon_exists,
  can_remove_addons_by_app,
  create:addons_create,
  delete_by_app,
  list:addons_list,
  http:{
    get:http_get,
    list:http_list,
    create:http_create,
    actions:http_actions,
    delete:http_delete,
    update:http_update
  },
  service_config_vars,
  transform_addon
};
