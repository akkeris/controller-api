const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

function to_response(plugin) {
  return {
    created_at: plugin.created.toISOString(),
    id: plugin.plugin,
    name: plugin.name,
    description: plugin.description,
    owner: {
      name: plugin.owner,
      email: plugin.email,
    },
    repo: plugin.repo,
    updated_at: plugin.updated.toISOString(),
  };
}

const delete_plugin = query.bind(query, fs.readFileSync('./sql/delete_plugin.sql').toString('utf8'), (r) => to_response(r));
async function del(pg_pool, req, res, regex) {
  const plugin_id = httph.first_match(req.url, regex);
  const plugins = await delete_plugin(pg_pool, [plugin_id]);
  if (plugins.length === 0) {
    throw new common.NotFoundError('The specified plugin was not found.');
  }
  return httph.ok_response(res, JSON.stringify(plugins[0]));
}

const select_plugin = query.bind(query, fs.readFileSync('./sql/select_plugin.sql').toString('utf8'), (r) => to_response(r));
async function info(pg_pool, req, res, regex) {
  const plugin_id = httph.first_match(req.url, regex);
  const plugins = await select_plugin(pg_pool, [plugin_id]);
  if (plugins.length === 0) {
    throw new common.NotFoundError('The specified plugin was not found.');
  }
  return httph.ok_response(res, JSON.stringify(plugins[0]));
}

const select_plugins = query.bind(query, fs.readFileSync('./sql/select_plugins.sql').toString('utf8'), (r) => to_response(r));
async function list(pg_pool, req, res /* regex */) {
  const plugins = await select_plugins(pg_pool, []);
  return httph.ok_response(res, JSON.stringify(plugins));
}

function check_plugin(payload) {
  assert.ok(!payload.name || /(^[A-z0-9]+$)/.exec(payload.name) !== null, 'The name of a plugin must be alpha numeric.');
  assert.ok(!payload.repo || payload.repo.startsWith('https://'), 'The provided repo must be a https url.');
  assert.ok(!payload.email || payload.email.indexOf('@') !== -1, 'The provided email was invalid.');
}

const update_plugin = query.bind(query, fs.readFileSync('./sql/update_plugin.sql').toString('utf8'), (r) => to_response(r));
async function update(pg_pool, req, res, regex) {
  const payload = await httph.buffer_json(req);
  const plugin_id = httph.first_match(req.url, regex);
  try {
    check_plugin(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  const plugins = await update_plugin(
    pg_pool,
    [
      plugin_id,
      payload.name,
      payload.description,
      payload.owner,
      payload.email,
      payload.repo,
    ],
  );
  if (plugins.length === 0) {
    throw new common.NotFoundError('The specified plugin was not found.');
  }
  return httph.ok_response(res, JSON.stringify(plugins[0]));
}

const insert_plugin = query.bind(query, fs.readFileSync('./sql/insert_plugin.sql').toString('utf8'), (r) => to_response(r));
async function create(pg_pool, req, res /* regex */) {
  const payload = await httph.buffer_json(req);
  try {
    assert.ok(payload.name, 'A plugin name is required.');
    assert.ok(payload.repo, 'A plugin repo (e.g., https://github.com/foo/bar) is required.');
    assert.ok(payload.email, 'An owners email address is required.');
    assert.ok(payload.owner, 'An owners name is required.');
    check_plugin(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  const plugins = await select_plugin(pg_pool, [payload.name]);
  if (plugins.length !== 0) {
    throw new common.UnprocessibleEntityError('The specified plugin already exists.');
  }
  const plugin_id = uuid.v4();
  const created_updated = new Date();
  const plugins_created = await insert_plugin(
    pg_pool,
    [
      plugin_id,
      payload.name,
      payload.description,
      payload.owner,
      payload.email,
      payload.repo,
      created_updated,
      created_updated,
    ],
  );
  return httph.created_response(res, JSON.stringify(plugins_created[0]));
}

module.exports = {
  delete: del,
  info,
  list,
  update,
  create,
};
