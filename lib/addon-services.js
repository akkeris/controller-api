"use strict";

const fs = require('fs');
const addons = require ('./addons/addons.js');
const httph = require('./http_helper.js');
const lifecycle = require('./lifecycle.js');
const common = require('./common.js');
const query = require('./query.js');
const formation = require('./formations.js');
const config = require('./config.js');
const spaces = require('./spaces.js');

const select_services = query.bind(query, fs.readFileSync('./sql/select_services.sql').toString('utf8'), (r) => { return r; });
const select_service = query.bind(query, fs.readFileSync('./sql/select_service.sql').toString('utf8'), (r) => { return r; });
const select_service_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });
const select_service_attached_apps = query.bind(query, fs.readFileSync('./sql/select_service_attached_apps.sql').toString('utf8'), (r) => { return r; });
const select_service_plan_apps = query.bind(query, fs.readFileSync('./sql/select_service_plan_apps.sql').toString('utf8'), (r) => { return r; });

function add_service(service, pg_pool) {
  // addons may return a function if they require a callback,
  // otherwise its the result from the service hard coded and
  // returned.  lets be a pal and deal with both.
  if(typeof service === 'function') {
    service(add_service, pg_pool)
  } else {
    global.services = global.services.concat([service]);
  }
}

function refresh_services(pg_pool) {
  // plugins with multiple services.
  try {
    global.services = [];
    add_service(require('./addons/vault.js'), pg_pool);
    add_service(require('./addons/alamo-postgres.js'), pg_pool);
    add_service(require('./addons/alamo-postgresonprem.js'), pg_pool);
    add_service(require('./addons/alamo-aurora-mysql.js'), pg_pool);
    add_service(require('./addons/alamo-redis.js'), pg_pool);
    add_service(require('./addons/alamo-memcached.js'), pg_pool);
    add_service(require('./addons/alamo-rabbitmq.js'), pg_pool);
    add_service(require('./addons/alamo-amazon-s3.js'), pg_pool);
    add_service(require('./addons/alamo-es.js'), pg_pool);
    add_service(require('./addons/alamo-mongodb.js'), pg_pool);
    add_service(require('./addons/twilio.js'), pg_pool);
    add_service(require('./addons/papertrail.js'), pg_pool);
    add_service(require('./addons/anomaly.js'), pg_pool);
    add_service(require('./addons/secure-key.js'), pg_pool);
  } catch (e) {
    console.error("Error in refreshing services:", e);
  }
}

function addon_by_id_or_name(addon_id_or_name) {
  let addons_info = global.services.filter((addon) => {
    let details = addon.info();
    return (details.id === addon_id_or_name || details.name === addon_id_or_name);
  });
  if(addons_info.length !== 1) {
    throw new common.NotFoundError("The specified addon could not be found.");
  }
  return addons_info[0];
}

function plan_by_id_or_name(plan_id_or_name) {
  let found_plans = [];
  global.services.forEach((addon) => {
    let plans = addon.plans();
    plans.forEach((plan) => {
      if(plan.id === plan_id_or_name || plan.name === plan_id_or_name) {
        found_plans.push(plan);
      }
    });
  });
  console.assert(found_plans.length === 1, `The specified plan could not be found: ${plan_id_or_name} (${found_plans.length})`);
  return found_plans[0];
}

function begin_timers(pg_pool) {
  refresh_services(pg_pool)
  setInterval(refresh_services.bind(refresh_services, pg_pool), 1000 * 60 * 60 * 2); // every two hours
  setTimeout(() => {
    global.services.forEach((addon) => { 
      try { 
        addon.timers.begin(pg_pool)
      } catch (e) {
        console.error("Unable to start timer for addon:", e);
      } 
    });
  },10);
}

async function services_list(pg_pool, req, res, regex) {
  let payload = JSON.stringify(global.services.sort((a, b) => {
    if(a.info().name > b.info().name) {
      return 1;
    } else {
      return -1;
    }
  }).map((addon) => { return addon.info(); }));
  httph.ok_response(res, payload);
}

async function services_get(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let addon = addon_by_id_or_name(addon_id_or_name);
  return httph.ok_response(res, JSON.stringify(addon.info()));
}

async function plans_list(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let addon = addon_by_id_or_name(addon_id_or_name);
  return httph.ok_response(res, JSON.stringify(addon.plans()));
}

async function plans_get(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let plan_id = httph.second_match(req.url, regex);
  let addon_info = addon_by_id_or_name(addon_id_or_name);
  let plans = addon_info.plans();
  let filtered_plans = plans.filter((plan) => { return plan.id === plan_id || plan.name.split(':')[1] === plan_id; });

  if(filtered_plans.length === 0) {
    throw new common.NotFoundError('The specified plan was not found.');
  } else if (filtered_plans.length > 1) {
    throw new common.InternalServerError(null, 'An error occured, the specified addon id and plan mapped to multiple addon plans.')
  }
  let results = await select_service_plan_apps(pg_pool, [plan_id]);
  let apps = results.map((app) => {return {"id":app.app, "name":`${app.name}-${app.space}`}});
  apps.sort((a,b) =>  ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)) ); 
  filtered_plans[0].provisioned_by = apps;
  return httph.ok_response(res, JSON.stringify(filtered_plans[0]));
}

async function service_exists(pg_pool, service_id, app_uuid) {
  let services = await select_service(pg_pool, [service_id, app_uuid]);
  if(services.length === 0) {
    throw new common.NotFoundError(`The specified service ${service_id} was not found.`)
  }
  let addon = addon_by_id_or_name(services[0].addon);
  let plan = plan_by_id_or_name(services[0].plan);
  console.assert(addon, "The specified addon does not exist.");
  console.assert(plan, "The specified addon plan does not exist.");
  return {service:services[0], addon, plan}
}

async function can_remove_addons_by_app(pg_pool, app_uuid) {
  return !(await select_services(pg_pool, [app_uuid])).some((service) => {
    // for some reason counts come out of postgres as strings not ints.
    // lets double check this before we 'cast'
    if(typeof(service.attachments) === 'string') {
      service.attachments = parseInt(service.attachments, 10);
    }
    return service.owned && service.attachments > 1
  });
}

async function addons_create(pg_pool, app_uuid, app_name, space_name, space_tags, org, plan, user) {
  let addon = null;
  try {
    console.assert(plan, 'A plan was not provided in the request.');
    plan = plan_by_id_or_name(plan);
    console.assert(plan, 'The specified plan could not be found.');
    console.assert(plan.state !== 'shutdown', 'The specified plan can no longer be created, as its been deprecated.');
    addon = addon_by_id_or_name(plan.addon_service.id);
    console.assert(addon, 'The specified addon could not be found.');
    space_tags = space_tags.split(',').map((x) => x.trim());
    console.assert(!plan.compliance || plan.compliance.filter((compliance) => { return space_tags.indexOf('compliance=' + compliance) !== -1 }).length === plan.compliance.length,
      'The specified addon may not be attached to this app.  It requires these necessary compliances in the space: ' + (plan.compliance ? plan.compliance.join(',') : []));
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }

  let proposed_service = addon.info()
  let services = await select_services(pg_pool, [app_uuid])
  let app = {id:app_uuid, name:app_name, space:space_name, org:org}

  // check to ensure region (specified implicitly by space_name) allows for the specified plan.
  let region = await common.alamo.region_name_by_space(pg_pool, space_name)
  if(plan.available_regions.indexOf(region) === -1) {
    throw new common.ConflictError('The specified addon or plan is not available in this spaces region.')
  }

  // check to ensure it allows multiple installs if it already exits.
  if(proposed_service.supports_multiple_installations === false && 
    services.filter((s) => { return plan.addon_service.id === s.addon }).length > 0)
  {
    throw new common.ConflictError("This addon is already created and attached to this application and cannot be used twice.")
  }

  let service = null;
  try {
    service = await addon.provision(pg_pool, app, plan);
  } catch (err) {
    if(err instanceof common.NoFormationsFoundError) {
      // create a web formation if non exists.
      await formation.create_dyno(pg_pool, app_uuid, app_name, space_name, 'web', null, 1, config.dyno_default_size, config.default_port, null);
      // try again.
      service = await addon.provision(pg_pool, app, plan);
    } else if(!(err instanceof common.WaitingForResourcesError)) {
      console.error("ERROR FATAL: Unexpectedly we were unable to create the necessary infrastructure, please contact your local maytag man (or woman).")
      console.error(err.message)
      console.error(err.stack)
      throw new common.InternalServerError(`Unexpectedly we were unable to create the necessary infrastructure, please contact your local maytag man (or woman).`)
    } else {
      throw err
    }
  }
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
        addons.transform_service(app, addon.info(), plan, service)
      ]
    }), user ? user : "System");
    lifecycle.restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org, 'Attached ' + plan.addon_service.name).catch((err) => { /* do nothing */ });
  }, 10)
  return addons.transform_service(app, addon.info(), plan, service);
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
  let services = await select_services(pg_pool, [app_uuid]);
  let app = {id:app_uuid, name:app_name, space:space_name, org:org_name};
  return services.map((service) => {
    try {
      let addon = addon_by_id_or_name(service.addon).info();
      let plan = plan_by_id_or_name(service.plan);
      console.assert(addon, 'The specified addon does not exist.');
      console.assert(plan, 'The specified addon plan does not exist.');
      return addons.transform_service(app, addon, plan, service);
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

async function addons_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let service_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let service = await service_exists(pg_pool, service_id, app.app_uuid)
  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name};
  let service_config_vars = await service.addon.config_vars(pg_pool, service.service, app.space_name, app.app_name);
  service.service.config_vars = {};
  for(let key in service_config_vars) {
    if(key !== 'spec') {
      service.service.config_vars[key] = service_config_vars[key];
    }
  }
  if(app.space_tags.indexOf('compliance=socs') !== -1) {
    service.service.config_vars = common.socs(service.service.config_vars)
  }
  let results = await select_service_attached_apps(pg_pool, [service_id]);
  let apps = results.map((app) => {return {"id":app.app, "name":`${app.name}-${app.space}`, "owner":app.owned}});
  apps.sort((a,b) =>  ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)) ); 
  let transformed_service = addons.transform_service(app_obj, service.addon.info(), service.plan, service.service);
  transformed_service.provisioned_by = apps;
  return httph.ok_response(res, JSON.stringify(transformed_service));
}

async function addons_actions(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let service_id = httph.second_match(req.url, regex)
  let action_id = httph.third_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let service = await service_exists(pg_pool, service_id, app.app_uuid)
  let payload = {}
  try { payload = await httph.buffer_json(req) } catch(e) { /* do nothing */ }
  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name};
  let action_result = await service.addon.action(pg_pool, service.plan, service.service, app_obj, action_id, req.url, payload);
  return httph.ok_response(res, JSON.stringify(action_result));
}

async function addons_delete(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let service_id = httph.second_match(req.url, regex)
  let action_id = httph.third_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)

  if(!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username']) && 
      (space.tags.indexOf('compliance=socs') > -1 || space.tags.indexOf('compliance=prod') > -1) ) 
  {
    throw new common.NotAllowedError("addons can only be destroyed by administrators on this app.")
  }

  let service = await service_exists(pg_pool, service_id, app.app_uuid)
  if(service.service.attachments > 1) {
    throw new common.ConflictError('This addon cannot be removed as its attached to other apps.')
  }

  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name}
  let result = await service.addon.unprovision(pg_pool, app_obj, service.plan, service.service)
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
        addons.transform_service(app_obj, service.addon.info(), service.plan, service.service)
      ]
    }), req.headers['x-username']);
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Dettached ' + service.plan.addon_service.name).catch((err) => { /* do nothing */ });
  }, 10);
  return httph.ok_response(res, JSON.stringify(addons.transform_service(app_obj, service.addon.info(), service.plan, service.service)));
}

async function addons_delete_by_app(pg_pool, app_uuid, app_name, space_name, org, user) {
  let services = await select_services(pg_pool, [app_uuid]);
  let app = { id:app_uuid, name:app_name, space:space_name, org:org };
  // TODO: Clean this up, we should have attachments in a seperate removal.
  let deleted_addons = []; // note these are NOT detached addons! but those permenantly removed!
  let detached_addons = []; // note these are detached addons. not those that are removed.

  // Remove attachments
  let service_attachments = await select_service_attachments(pg_pool, [app_uuid]);
  await Promise.all(service_attachments.map(async (service) => {
    let addon = addon_by_id_or_name(service.addon);
    let plan = plan_by_id_or_name(service.plan);
    detached_addons.push(addons.transform_service(app, addon.info(), plan, service));
    return await addon.detach(pg_pool, app, plan, service)
  }))

  // Remove addons
  let results = await Promise.all(services.map(async (service) => {
    let addon = addon_by_id_or_name(service.addon);
    let plan = plan_by_id_or_name(service.plan);
    // for some reason counts come out of postgres as strings not ints.
    // lets double check this before we 'cast'
    if(typeof(service.attachments) === 'string') {
      service.attachments = parseInt(service.attachments, 10);
    }
    if(service.owned) {
      deleted_addons.push(addons.transform_service(app, addon.info(), plan, service));
      return await addon.unprovision(pg_pool, app, plan, service);
    } else {
      console.error("ERROR: Unable to remove addon as its not owned, yet somehow was requested to be removed.")
      console.error(service)
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
  let services = await select_services(pg_pool, [app_uuid]); 
  let service_attachments = await select_service_attachments(pg_pool, [app_uuid]); 
  let data_return = {};
  for(let i=0; i < services.length; i++) {
    let service = services[i]
    try {
      let addon = addon_by_id_or_name(service.addon);
      let data = await addon.config_vars(pg_pool, service, space_name, app_name);
      Object.keys(data).forEach((key) => {
        if(key !== 'spec') {
          data_return[key] = data[key];
        }
      });
    } catch (e) {
      // could happen if a addon is removed.
    }
  }
  for(let i=0; i < service_attachments.length; i++) {
    let service = service_attachments[i]
    try {
      let addon = addon_by_id_or_name(service.addon);
      let data = await addon.config_vars(pg_pool, service, space_name, app_name);
      Object.keys(data).forEach((key) => {
        if(key !== 'spec') {
          data_return[key] = data[key];
        }
      });
    } catch (e) {
      // could happen if a addon is removed.
    }
  }
  return data_return;
}

if(typeof(global.services) === 'undefined') {
  global.services = [];
}

module.exports = {
  services:{
    list:services_list,
    get:services_get,
  },
  plans:{
    list:plans_list,
    get:plans_get
  },
  addon_by_id_or_name,
  plan_by_id_or_name,
  addons:{
    can_remove_addons_by_app,
    list:addons_list,
    get:addons_get,
    http:{
      list:http_list,
      create:http_create
    },
    create:addons_create,
    delete:addons_delete,
    delete_by_app:addons_delete_by_app,
    actions:addons_actions
  },
  timers:{
    begin:begin_timers
  },
  service_config_vars,
  service_exists
};