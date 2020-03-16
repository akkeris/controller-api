"use strict"

const assert = require('assert')
const url = require('url');
const config = require('./config.js');
const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');
const fs = require('fs');

let curl = config.log_shuttle_url ? (new url.URL(config.log_shuttle_url)) : '';
let log_shuttle_url = curl !== '' ? (curl.protocol + "//" + curl.host) : '';
let log_shuttle_token = curl !== '' ? (curl.username ? (curl.password ? curl.username + ':' + curl.password : curl.username) : '') : '';
let log_shuttle_headers = {"content-type":"application/json","authorization":log_shuttle_token}

const update_app_updated_at = query.bind(query, fs.readFileSync("./sql/update_app_updated_at.sql").toString('utf8'), (r) => { return r; });

async function create_app_logdrain(pg_pool, app_uuid, app_name, space_name, url, user) {
  assert.ok(app_uuid, 'Cannot create log-drain, app uuid is undefined.')
  assert.ok(app_name, 'Cannot create log-drain, app name is undefined.')
  assert.ok(space_name, 'Cannot create log-drain, space name is undefined.')
  assert.ok(url, 'Cannot create log-drain, url is undefined.')

  let data = await common.alamo.drains.create(pg_pool, 'app', app_name + '-' + space_name, url)
  
  common.notify_hooks(pg_pool, app_uuid, 'logdrain_change', JSON.stringify({
    'action':'logdrain_change',
    'app':{
      'name':app_name,
      'id':app_uuid
    },
    'space':{
      'name':space_name
    },
    'change':'create',
    'changes':[ { "url":data.url, "id":data.id } ]
  }), user ? user : "System");
  return data
}

async function create_site_logdrain(pg_pool, site_uuid, site_name, url, user) {
  assert.ok(site_uuid, 'Cannot create log-drain, site uuid is undefined.')
  assert.ok(site_name, 'Cannot create log-drain, site name is undefined.')
  assert.ok(url, 'Cannot create log-drain, url is undefined.')
  return await common.alamo.drains.create(pg_pool, 'site', site_name, url)
}

async function list_app_logdrain(pg_pool, app_uuid, app_name, space_name) {
  return await common.alamo.drains.list(pg_pool, 'app', app_name + '-' + space_name)
}

async function list_site_logdrain(pg_pool, site_uuid, site_name) {
  return await common.alamo.drains.list(pg_pool, 'site', site_name)
}

async function get_app_logdrain(pg_pool, app_uuid, app_name, space_name, drain_id) {
  return await common.alamo.drains.get(pg_pool, 'app', app_name + '-' + space_name, drain_id)
}

async function get_site_logdrain(pg_pool, site_uuid, site_name, drain_id) {
  return await common.alamo.drains.get(pg_pool, 'site', site_name, drain_id)
}

async function del_app_logdrain(pg_pool, app_uuid, app_name, space_name, drain_id, user) {
  let data = await common.alamo.drains.delete(pg_pool, 'app', app_name + '-' + space_name, drain_id)
  common.notify_hooks(pg_pool, app_uuid, 'logdrain_change', JSON.stringify({
    'action':'logdrain_change',
    'app':{
      'name':app_name,
      'id':app_uuid
    },
    'space':{
      'name':space_name
    },
    'change':'delete',
    'changes':[ { "id":drain_id } ]
  }), user ? user : "System")
  return data
}


async function del_site_logdrain(pg_pool, site_uuid, site_name, drain_id, user) {
  return await common.alamo.drains.delete(pg_pool, 'site', site_name, drain_id)
}

async function delete_all_app_drains(pg_pool, app_uuid, app_name, space_name, org_name) {
  return await Promise.all((await list_app_logdrain(pg_pool, app_uuid, app_name, space_name))
    .map((drain) => del_app_logdrain(pg_pool, app_uuid, app_name, space_name, drain.id)))
}

async function http_create(pg_pool, req, res, regex) {
  if(req.url.indexOf('/sites/') === -1) {
    let app_key = httph.first_match(req.url, regex);
    let app = await common.app_exists(pg_pool, app_key);
    let body = await httph.buffer_json(req, res);
    if(!body || !body.url) {
      throw new common.BadRequestError('The request did not include a "url" parameter.');
    }
    let existing_drains = await list_app_logdrain(pg_pool, app.app_uuid, app.app_name, app.space_name);
    if(existing_drains.some((x) => x.url.toLowerCase().trim() === body.url.toLowerCase().trim())) {
      throw new common.BadRequestError('The requested log drain already exists on this application.');
    }
    await update_app_updated_at(pg_pool, [app.app_uuid]);
    return httph.created_response(res, 
      JSON.stringify(await create_app_logdrain(pg_pool, app.app_uuid, app.app_name, app.space_name, body.url, req.headers['x-username'])))
  } else {
    let site_key = httph.first_match(req.url, regex)
    let site = await common.site_exists(pg_pool, site_key);
    let body = await httph.buffer_json(req, res)
    if(!body || !body.url) {
      throw new common.BadRequestError('The request did not include a "url" parameter.');
    }
    let existing_drains = await list_site_logdrain(pg_pool, site.site, site.domain);
    if(existing_drains.some((x) => x.url.toLowerCase().trim() === body.url.toLowerCase().trim())) {
      throw new common.BadRequestError('The requested log drain already exists on this site.');
    }
    return httph.created_response(res, 
      JSON.stringify(await create_site_logdrain(pg_pool, site.site, site.domain, body.url, req.headers['x-username'])))
  }
}

async function http_list(pg_pool, req, res, regex) {
  if(req.url.indexOf('/sites/') === -1) {
    let app_key = httph.first_match(req.url, regex)
    let app = await common.app_exists(pg_pool, app_key)
    return httph.ok_response(res, await list_app_logdrain(pg_pool, app.app_uuid, app.app_name, app.space_name))
  } else {
    let site_key = httph.first_match(req.url, regex)
    let site = await common.site_exists(pg_pool, site_key)
    return httph.ok_response(res, await list_site_logdrain(pg_pool, site.site, site.domain))
  }
}

async function http_get(pg_pool, req, res, regex) {
  if(req.url.indexOf('/sites/') === -1) {
    let app_key = httph.first_match(req.url, regex)
    let drain_id = httph.second_match(req.url, regex)
    let app = await common.app_exists(pg_pool, app_key)
    return httph.ok_response(res, await get_app_logdrain(pg_pool, app.app_uuid, app.app_name, app.space_name, drain_id))
  } else {
    let site_key = httph.first_match(req.url, regex)
    let drain_id = httph.second_match(req.url, regex)
    let site = await common.site_exists(pg_pool, site_key)
    return httph.ok_response(res, await get_site_logdrain(pg_pool, site.site, site.domain, drain_id))

  }
}

async function http_delete(pg_pool, req, res, regex) {
  if(req.url.indexOf('/sites/') === -1) {
    let app_key = httph.first_match(req.url, regex)
    let drain_id = httph.second_match(req.url, regex)
    let app = await common.app_exists(pg_pool, app_key)
    await update_app_updated_at(pg_pool, [app.app_uuid]);
    return httph.ok_response(res, await del_app_logdrain(pg_pool, app.app_uuid, app.app_name, app.space_name, drain_id, req.headers['x-username']))
  } else {
    let site_key = httph.first_match(req.url, regex)
    let drain_id = httph.second_match(req.url, regex)
    let site = await common.site_exists(pg_pool, site_key)
    return httph.ok_response(res, await del_site_logdrain(pg_pool, site.site, site.domain, drain_id, req.headers['x-username']))
  }
}

async function event(pg_pool, app, space, data) {
  return await common.log_event(pg_pool, app, space, data);
}

module.exports = {
  http:{
    create:http_create,
    list:http_list,
    get:http_get,
    delete:http_delete
  },
  create:create_app_logdrain,
  list:list_app_logdrain,
  get:get_app_logdrain,
  delete:del_app_logdrain,
  delete_all_drains:delete_all_app_drains,
  event
}