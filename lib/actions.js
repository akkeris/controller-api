const fs = require('fs');
const { isBoolean, isNumber } = require('util');
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
  const payload = await http_helper.buffer_json(req);
  const formation_type = `actions${payload.name}`;

  // Create a one-off formation
  const formation = await formations.create(
    pg_pool,
    app.app_uuid,
    app.app_name,
    app.space_name,
    app.space_tags,
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
  const action_id = uuid.v4();
  const created_by = req.headers['x-username'] || 'unknown';
  const action_params = [
    action_id,
    app.app_uuid,
    formation.id,
    payload.name,
    payload.description || '',
    created_by,
  ];
  const actions = await insert_action(pg_pool, action_params);

  return http_helper.created_response(res, actions);
}

const delete_action = query.bind(query, fs.readFileSync('sql/delete_action.sql').toString('utf8'), (result) => result);
async function http_delete(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const action_key = http_helper.second_match(req.url, regex);
  const action = await common.action_exists(pg_pool, app.app_uuid, action_key);

  await formations.delete_dyno(pg_pool, app.app_uuid, app.app_name, app.space_name, action.formation.type);

  await delete_action(pg_pool, [action.action]);

  return http_helper.ok_response(res, action);
}

async function http_get(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const action_key = http_helper.second_match(req.url, regex);
  const action = await common.action_exists(pg_pool, app.app_uuid, action_key);
  return http_helper.ok_response(res, action);
}

const select_actions = query.bind(query, fs.readFileSync('sql/select_all_actions.sql').toString('utf8'), (result) => result);
async function http_list(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const actions = await select_actions(pg_pool, [app.app_uuid]);
  return http_helper.ok_response(res, actions);
}

const update_action = query.bind(query, fs.readFileSync('sql/update_action.sql').toString('utf-8'), (result) => result);
async function http_update(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const action_key = http_helper.second_match(req.url, regex);
  const action = await common.action_exists(pg_pool, app.app_uuid, action_key);
  const payload = await http_helper.buffer_json(req);

  const key_exists = (key) => Object.keys(payload).findIndex((k) => k === key) !== -1;

  // Required fields (can't set to empty string)
  ['name', 'size', 'command'].forEach((key) => {
    if (key_exists(key) && (payload[key] === '' || isBoolean(payload[key]) || isNumber(payload[key]))) {
      throw new common.BadRequestError(`Action ${key} (if provided) must be a valid alphanumeric string.`);
    }
  });

  // Optional fields (set to empty string to clear)
  ['description'].forEach((key) => {
    if (key_exists(key) && (isBoolean(payload[key]) || isNumber(payload[key]))) {
      throw new common.BadRequestError(`Action ${key} (if provided) must be a valid string.`);
    }
  });

  try {
    await update_action(pg_pool, [action.action, payload.name, payload.description]);
  } catch (err) {
    throw new common.BadRequestError('Unable to update action. Please check the payload and try again.');
  }

  // The rest of the payload (size, command, options) should be passed to update the formation (along with name/type)
  try {
    await formations.oneoff_update(
      pg_pool,
      app.app_uuid,
      app.space_name,
      action.formation.id,
      payload.name ? `actions${payload.name}` : undefined,
      payload.size,
      payload.command,
      payload.options,
    );
  } catch (err) {
    throw new http_helper.BadRequestError(err.message);
  }

  const updated_action = await common.action_exists(pg_pool, app.app_uuid, action_key);

  return http_helper.ok_response(res, updated_action);
}

const insert_action_run = query.bind(query, fs.readFileSync('sql/insert_action_run.sql').toString('utf8'), (result) => result);
const select_latest_image = query.bind(query, fs.readFileSync('./sql/select_latest_image.sql').toString('utf8'), (r) => r);
async function http_runs_create(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const action_key = http_helper.second_match(req.url, regex);
  const action = await common.action_exists(pg_pool, app.app_uuid, action_key);

  let image;

  // If there is an image override, use it. Otherwise use the latest app image
  if (action.formation.options && action.formation.options.image && action.formation.options.image !== '') {
    image = action.formation.options.image;
  } else {
    const latest_image = (await select_latest_image(pg_pool, [app.app_uuid]))[0];
    image = common.registry_image(
      latest_image.build_org_name,
      latest_image.build_app_name,
      latest_image.build_app,
      latest_image.foreign_build_key,
      latest_image.foreign_build_system,
    );
  }

  // Deploy a one-off dyno
  const runid = uuid.v4();
  const labels = {
    'akkeris.io/action': 'true',
    'akkeris.io/action-name': `${action.name}`,
    'akkeris.io/action-uuid': `${action.action}`,
    'akkeris.io/action-run-uuid': `${runid}`,
  };
  let env = null;
  if (action.formation.options && action.formation.options.env && Object.keys(action.formation.options.env).length > 0) {
    env = action.formation.options.env;
  }
  await common.alamo.oneoff_deploy(
    pg_pool,
    app.space_name,
    app.app_name,
    action.formation.type,
    image,
    action.formation.command,
    labels,
    env,
    action.formation.size,
    runid,
  );
  // Insert an action run into the DB
  const created_by = req.headers['x-username'] || 'unknown';
  const action_run_params = [
    runid,
    action.action,
    'running',
    null,
    created_by,
  ];
  const action_runs = await insert_action_run(pg_pool, action_run_params);

  return http_helper.created_response(res, action_runs);
}

const select_action_runs = query.bind(query, fs.readFileSync('sql/select_all_action_runs.sql').toString('utf8'), (result) => result);
async function http_runs_list(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const action_key = http_helper.second_match(req.url, regex);
  const action = await common.action_exists(pg_pool, app.app_uuid, action_key);
  const action_runs = await select_action_runs(pg_pool, [action.action]);

  return http_helper.ok_response(res, action_runs);
}

const select_action_run = query.bind(query, fs.readFileSync('sql/select_action_run.sql').toString('utf8'), (result) => result);
async function http_runs_get(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const action_key = http_helper.second_match(req.url, regex);
  const action = await common.action_exists(pg_pool, app.app_uuid, action_key);
  const run_key = http_helper.third_match(req.url, regex);
  const action_run = (await select_action_run(pg_pool, [action.action, run_key]))[0];

  if (!action_run) {
    throw new http_helper.NotFoundError(`The specified action run ${run_key} does not exist.`);
  }

  return http_helper.ok_response(res, action_run);
}

module.exports = {
  http: {
    create: http_create,
    get: http_get,
    list: http_list,
    delete: http_delete,
    update: http_update,
    runs: {
      create: http_runs_create,
      list: http_runs_list,
      get: http_runs_get,
    },
  },
};
