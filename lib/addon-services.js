"use strict";

const assert = require('assert')
const fs = require('fs')
const httph = require('./http_helper.js')
const common = require('./common.js')
const query = require('./query.js')
const config = require('./config.js')

const select_service_plan_apps = query.bind(query, fs.readFileSync('./sql/select_service_plan_apps.sql').toString('utf8'), (r) => { return r; });

function add_service(service, pg_pool) {
  // addons may return a function if they require a callback,
  // otherwise its the result from the service hard coded and
  // returned.  lets be a pal and deal with both.
  if(typeof service === 'function') {
    service(add_service, pg_pool)
  } else {
    if (service.info().available_regions.length === 0) {
      console.log('Warning, service wanted to register but had no available regions:', service.info().name)
    }
    global.services = global.services.concat([service]);
  }
}

function refresh_services(pg_pool) {
  // plugins with multiple services.
  try {
    global.services = [];
    add_service(require('./addons/alamo-memcached.js'), pg_pool);
    add_service(require('./addons/alamo-redis.js'), pg_pool);
    add_service(require('./addons/alamo-postgres.js'), pg_pool);
    add_service(require('./addons/vault.js'), pg_pool);
    add_service(require('./addons/alamo-postgresonprem.js'), pg_pool);
    add_service(require('./addons/alamo-aurora-mysql.js'), pg_pool);
    add_service(require('./addons/alamo-rabbitmq.js'), pg_pool);
    add_service(require('./addons/alamo-amazon-s3.js'), pg_pool);
    add_service(require('./addons/alamo-es.js'), pg_pool);
    add_service(require('./addons/alamo-mongodb.js'), pg_pool);
    add_service(require('./addons/twilio.js'), pg_pool);
    add_service(require('./addons/papertrail.js'), pg_pool);
    add_service(require('./addons/anomaly.js'), pg_pool);
    add_service(require('./addons/secure-key.js'), pg_pool);
    add_service(require('./addons/alamo-neptune.js'), pg_pool);
    add_service(require('./addons/alamo-influxdb.js'), pg_pool);
    add_service(require('./addons/alamo-cassandra.js'), pg_pool);
    add_service(require('./addons/alamo-kafka.js'), pg_pool);
  } catch (e) {
    console.error("Error in refreshing services:", e);
  }
}

function service_by_id_or_name(addon_id_or_name) {
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
      if(plan.id === plan_id_or_name || plan.name === plan_id_or_name || plan.key == plan_id_or_name) {
        found_plans.push(plan);
      }
    });
  });
  assert.ok(found_plans.length === 1, `The specified plan could not be found: ${plan_id_or_name} (${found_plans.length})`);
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
  let addon = service_by_id_or_name(addon_id_or_name);
  return httph.ok_response(res, JSON.stringify(addon.info()));
}

async function plans_list(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let addon = service_by_id_or_name(addon_id_or_name);
  return httph.ok_response(res, JSON.stringify(addon.plans()));
}

async function plans_get(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let plan_id_or_name = httph.second_match(req.url, regex);
  let addon_info = service_by_id_or_name(addon_id_or_name);
  let plans = addon_info.plans();

  let filtered_plans = plans.filter((plan) => { return plan.id === plan_id_or_name || plan.name.split(':')[1] === plan_id_or_name || plan.name === plan_id_or_name});

  if(filtered_plans.length === 0) {
    throw new common.NotFoundError('The specified plan was not found.');
  } else if (filtered_plans.length > 1) {
    throw new common.InternalServerError(null, 'An error occured, the specified addon id and plan mapped to multiple addon plans.')
  }
  let results = await select_service_plan_apps(pg_pool, [filtered_plans[0].id]);
  let apps = results.map((app) => {return {"id":app.app, "name":`${app.name}-${app.space}`}});
  apps.sort((a,b) =>  ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)) ); 
  filtered_plans[0].provisioned_by = apps;
  return httph.ok_response(res, JSON.stringify(filtered_plans[0]));
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
  service_by_id_or_name,
  plan_by_id_or_name,
  timers:{
    begin:begin_timers
  }
};
