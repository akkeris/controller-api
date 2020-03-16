"use strict";

const assert = require('assert')
const fs = require('fs')
const httph = require('./http_helper.js')
const common = require('./common.js')
const query = require('./query.js')
const config = require('./config.js')


async function services_list(pg_pool, req, res, regex) {
  let payload = JSON.stringify(common.services().sort((a, b) => {
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
  let addon = common.service_by_id_or_name(addon_id_or_name);
  return httph.ok_response(res, JSON.stringify({...addon.info(), "plans":addon.plans()}));
}

async function plans_list(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let addon = common.service_by_id_or_name(addon_id_or_name);
  return httph.ok_response(res, JSON.stringify(addon.plans()));
}

const select_service_plan_apps = query.bind(query, fs.readFileSync('./sql/select_service_plan_apps.sql').toString('utf8'), (r) => { return r; });
async function plans_get(pg_pool, req, res, regex) {
  let addon_id_or_name = httph.first_match(req.url, regex);
  let plan_id_or_name = httph.second_match(req.url, regex);
  let addon_info = common.service_by_id_or_name(addon_id_or_name);
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
module.exports = {
  services:{
    list:services_list,
    get:services_get,
  },
  plans:{
    list:plans_list,
    get:plans_get
  },
  timers:{
    begin() {},
  },
};
