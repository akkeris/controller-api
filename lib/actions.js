const fs = require('fs');
const uuid = require('uuid');

const common = require('./common');
const formations = require('./formations');
const http_helper = require('./http_helper');
const query = require('./query');

// private
const insert_action = query.bind(query, fs.readFileSync('sql/insert_action.sql').toString('utf8'), (result) => result);
async function http_create(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const space = await common.space_exists(pg_pool, app.space_name);
  const payload = await http_helper.buffer_json(req);
  const formation_type = `actions${payload.name}`;

  // Create a one-off formation
  const formation = await formations.create(
    pg_pool,
    app.app_uuid,
    app.app_name,
    app.space_name,
    space.tags,
    app.org_name,
    formation_type,
    payload.size,
    1,
    payload.command,
    null,
    null,
    false,
    'System',
    true,
    payload.options,
  );

  // Insert an action into the DB
  const id = uuid.v4();
  const created_by = req.headers['x-username'] || 'Unknown';
  const actions_params = [
    id,
    app.app_uuid,
    formation.id,
    payload.name,
    payload.description || '',
    created_by,
  ];
  const actions = await insert_action(pg_pool, actions_params);
  return http_helper.created_response(res, actions);
}

module.exports = {
  http: {
    create: http_create,
  },
};
