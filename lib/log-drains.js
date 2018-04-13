"use strict"

const url = require('url');
const config = require('./config.js');
const common = require('./common.js');
const httph = require('./http_helper.js');

let curl = url.parse(config.log_shuttle_url);
let log_shuttle_url = curl.protocol + "//" + curl.host;
let log_shuttle_token = curl.auth ? curl.auth : '';
let log_shuttle_headers = {"content-type":"application/json","authorization":log_shuttle_token}


async function create(pg_pool, app_uuid, app_name, space_name, url) {
  console.assert(app_uuid, 'Cannot create log-drain, app uuid is undefined.')
  console.assert(app_name, 'Cannot create log-drain, app name is undefined.')
  console.assert(space_name, 'Cannot create log-drain, space name is undefined.')
  console.assert(url, 'Cannot create log-drain, url is undefined.')
  let data = JSON.parse((await httph.request('post', `${log_shuttle_url}/apps/${app_name}-${space_name}/log-drains`, log_shuttle_headers, JSON.stringify({url}))).toString())
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
  }));
  return data
}

async function list(pg_pool, app_uuid, app_name, space_name) {
  return JSON.parse((await httph.request('get', `${log_shuttle_url}/apps/${app_name}-${space_name}/log-drains`, log_shuttle_headers, null)).toString())
}

async function get(pg_pool, app_uuid, app_name, space_name, drain_id) {
  return JSON.parse((await httph.request('get', `${log_shuttle_url}/apps/${app_name}-${space_name}/log-drains/${drain_id}`, log_shuttle_headers, null)).toString())
}

async function del(pg_pool, app_uuid, app_name, space_name, drain_id) {
  let data = JSON.parse((await httph.request('delete', `${log_shuttle_url}/apps/${app_name}-${space_name}/log-drains/${drain_id}`, log_shuttle_headers, null)).toString())
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
  }), req.headers['x-username'])
  return data
}

async function delete_all_drains(pg_pool, app_uuid, app_name, space_name, org_name) {
  let drains = await list(pg_pool, app_uuid, app_name, space_name)
  return await Promise.all(drains.map(drain => del(pg_pool, app_uuid, app_name, space_name, drain.id)))
}


async function http_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key);
  let body = await httph.buffer_json(req, res)
  if(!body || !body.url) {
    throw new common.BadRequestError('The request did not include a "url" parameter.');
  }
  let drain = await create(pg_pool, app.app_uuid, app.app_name, app.space_name, body.url)
  return httph.created_response(res, JSON.stringify(drain))
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
  return httph.ok_response(res, await del(pg_pool, app.app_uuid, app.app_name, app.space_name, drain_id))
}

async function event(app, space, data) {
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
  let payload = {
    "log":data,
    "stream":"stdout",
    "time":((new Date()).toISOString()),
    "docker":{
      "container_id":""
    },
    "kubernetes":
    {
      "namespace_name":space,
      "pod_id":"",
      "pod_name":"akkeris/event",
      "container_name":app,
      "labels":{
        "name":""
      },
      "host":""
    },
    "topic":space,
    "tag":""
  };
  try {
    await httph.request('post', `${log_shuttle_url}/log-events`, log_shuttle_headers, JSON.stringify(payload))
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