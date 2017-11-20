"use strict"

const common = require('./common.js');
const config = require('./config.js');
const httph = require('./http_helper.js');
const fs = require('fs');
const uuid = require('uuid');
const query = require('./query.js');

function to_response(plugin) {
  return {
    created_at:plugin.created.toISOString(),
    id:plugin.plugin,
    name:plugin.name,
    description:plugin.description,
    owner:{
      name:plugin.owner,
      email:plugin.email,
    },
    repo:plugin.repo,
    updated_at:plugin.updated.toISOString()
  }
}

let delete_plugin = query.bind(query, fs.readFileSync('./sql/delete_plugin.sql').toString('utf8'), (r) => { return to_response(r); });
async function del(pg_pool, req, res, regex) {
  let plugin_id = httph.first_match(req.url, regex);
  let plugins = await delete_plugin(pg_pool, [plugin_id])
  if(plugins.length === 0) {
    throw new common.NotFoundError('The specified plugin was not found.')
  }
  return httph.ok_response(res, JSON.stringify(plugins[0]));
}

let select_plugin = query.bind(query, fs.readFileSync('./sql/select_plugin.sql').toString('utf8'), (r) => { return to_response(r); });
async function info(pg_pool, req, res, regex) {
  let plugin_id = httph.first_match(req.url, regex);
  let plugins = await select_plugin(pg_pool, [plugin_id])
  if(plugins.length === 0) {
    throw new common.NotFoundError('The specified plugin was not found.')
  }
  return httph.ok_response(res, JSON.stringify(plugins[0]));
}

let select_plugins = query.bind(query, fs.readFileSync('./sql/select_plugins.sql').toString('utf8'), (r) => { return to_response(r); });
async function list(pg_pool, req, res, regex) {
  let plugins = await select_plugins(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(plugins))
}

function check_plugin(payload) {
  console.assert(!payload.name || /(^[A-z0-9]+$)/.exec(payload.name) !== null, 'The name of a plugin must be alpha numeric.');
  console.assert(!payload.repo || payload.repo.startsWith('https://'), 'The provided repo must be a https url.');
  console.assert(!payload.email || payload.email.indexOf('@') !== -1, 'The provided email was invalid.');
}

let update_plugin = query.bind(query, fs.readFileSync('./sql/update_plugin.sql').toString('utf8'), (r) => { return to_response(r); });
async function update(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let plugin_id = httph.first_match(req.url, regex);
  try {
    check_plugin(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let plugins = await update_plugin(pg_pool, [plugin_id, payload.name, payload.description, payload.owner, payload.email, payload.repo])
  if(plugins.length === 0) {
    throw new common.NotFoundError('The specified plugin was not found.')
  }
  return httph.ok_response(res, JSON.stringify(plugins[0]));
}

let insert_plugin = query.bind(query, fs.readFileSync('./sql/insert_plugin.sql').toString('utf8'), (r) => { return to_response(r); });
async function create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    console.assert(payload.name, 'A plugin name is required.');
    console.assert(payload.repo, 'A plugin repo (e.g., https://github.com/foo/bar) is required.');
    console.assert(payload.email, 'An owners email address is required.');
    console.assert(payload.owner, 'An owners name is required.');
    check_plugin(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let plugins = await select_plugin(pg_pool, [payload.name])
  if(plugins.length !== 0) {
    throw new common.UnprocessibleEntityError('The specified plugin already exists.')
  }
  let plugin_id = uuid.v4();
  let created_updated = new Date();
  let plugins_created = await insert_plugin(pg_pool, [plugin_id, payload.name, payload.description, payload.owner, payload.email, payload.repo, created_updated, created_updated])
  return httph.created_response(res, JSON.stringify(plugins_created[0]));
}

module.exports = {
  delete:del,
  info:info,
  list:list,
  update:update,
  create:create
}