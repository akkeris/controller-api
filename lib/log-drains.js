"use strict"

const assert = require('assert')
const url = require('url');
const config = require('./config.js');
const common = require('./common.js');
const httph = require('./http_helper.js');

let curl = config.log_shuttle_url ? url.parse(config.log_shuttle_url) : '';
let log_shuttle_url = curl !== '' ? (curl.protocol + "//" + curl.host) : '';
let log_shuttle_token = curl !== '' ? (curl.auth ? curl.auth : '') : '';
let log_shuttle_headers = {"content-type":"application/json","authorization":log_shuttle_token}

async function create(pg_pool, app_uuid, app_name, space_name, url, user) {
  assert.ok(app_uuid, 'Cannot create log-drain, app uuid is undefined.')
  assert.ok(app_name, 'Cannot create log-drain, app name is undefined.')
  assert.ok(space_name, 'Cannot create log-drain, space name is undefined.')
  assert.ok(url, 'Cannot create log-drain, url is undefined.')

  let data = await common.alamo.drains.create(pg_pool, space_name, app_name, url)
  
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

async function list(pg_pool, app_uuid, app_name, space_name) {
  return await common.alamo.drains.list(pg_pool, space_name, app_name)
}

async function get(pg_pool, app_uuid, app_name, space_name, drain_id) {
  return await common.alamo.drains.get(pg_pool, space_name, app_name, drain_id)
}

async function del(pg_pool, app_uuid, app_name, space_name, drain_id, user) {
  let data = await common.alamo.drains.delete(pg_pool, space_name, app_name, drain_id)
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

async function delete_all_drains(pg_pool, app_uuid, app_name, space_name, org_name) {
  return await Promise.all((await list(pg_pool, app_uuid, app_name, space_name))
    .map(drain => del(pg_pool, app_uuid, app_name, space_name, drain.id)))
}

async function http_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key);
  let body = await httph.buffer_json(req, res)
  if(!body || !body.url) {
    throw new common.BadRequestError('The request did not include a "url" parameter.');
  }
  return httph.created_response(res, 
    JSON.stringify(await create(pg_pool, app.app_uuid, app.app_name, app.space_name, body.url, req.headers['x-username'])))
}

async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  return httph.ok_response(res, await list(pg_pool, app.app_uuid, app.app_name, app.space_name))
}

async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let drain_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  return httph.ok_response(res, await get(pg_pool, app.app_uuid, app.app_name, app.space_name, drain_id))
}

async function http_delete(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let drain_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  return httph.ok_response(res, await del(pg_pool, app.app_uuid, app.app_name, app.space_name, drain_id, req.headers['x-username']))
}

async function event(pg_pool, app, space, data) {
  if(!app || !space || app === '' || space === '') {
    console.error(`ERROR: Unable to direct log-drain event, app ${app} or space ${space} was blank!`)
    return;
  }
  if(Buffer.isBuffer(data)) {
    data = data.toString('utf8');
  }
  if(typeof data !== 'string') {
    data = data.toString();
  }
  try {
    await common.alamo.drains.event(pg_pool, space, app, data)
  } catch (err) {
    console.warn("Unable to submit custom log message:", err);
  }
}

module.exports = {
  http:{
    create:http_create,
    list:http_list,
    get:http_get,
    delete:http_delete
  },
  create,
  list,
  get,
  delete:del,
  delete_all_drains,
  event
}