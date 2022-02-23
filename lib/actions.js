const fs = require('fs');
const { isBoolean, isNumber } = require('util');
const uuid = require('uuid');

const common = require('./common');
const formations = require('./formations');
const http_helper = require('./http_helper');
const query = require('./query');
const hooks = require('./hooks');

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    // eslint-disable-next-line no-await-in-loop
    await callback(array[index], index, array);
  }
};

// Verify events are valid. Events should be a comma separated string of events
function check_events(events) {
  if (events && typeof events !== 'string') {
    throw new common.BadRequestError('Events should be a comma separated string of events');
  }
  // Invalid events - action_*, destroy
  if (events && events !== '') {
    const valid_events = hooks.available_hooks;
    const events_array = events.split(',');
    events_array.forEach((event) => {
      if (event.startsWith('action_') || event === 'destroy') {
        // Don't trigger actions on top of other actions, don't trigger actions on destroy
        // Might change in the future, but for now let's keep it simple
        throw new common.BadRequestError(`Event ${event} is unable to trigger actions, please remove and try again`);
      } else if (!valid_events.map(x => x.type).includes(event)) {
        throw new common.BadRequestError(`Event ${event} is not a valid event, please remove and try again`);
      }
    });
  }
  return true;
}

// private
const insert_action = query.bind(query, fs.readFileSync('sql/insert_action.sql').toString('utf8'), (result) => result);
async function http_create(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const payload = await http_helper.buffer_json(req);

  const key_exists = (key) => Object.keys(payload).findIndex((k) => k === key) !== -1;

  // Validate existence of required fields
  ['name', 'command'].forEach((key) => {
    if (!key_exists(key) || (payload[key] === '' || isBoolean(payload[key]) || isNumber(payload[key]))) {
      throw new common.BadRequestError(`Payload field ${key} must be a valid, non-null alphanumeric string.`);
    }
  });

  const formation_type = `actions${payload.name}`;

  check_events(payload.events);

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
    payload.events || '',
    created_by,
  ];
  const action = (await insert_action(pg_pool, action_params))[0];

  return http_helper.created_response(res, action);
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
  ['size', 'command'].forEach((key) => {
    if (key_exists(key) && (payload[key] === '' || isBoolean(payload[key]) || isNumber(payload[key]))) {
      throw new common.BadRequestError(`Action ${key} (if provided) must be a valid alphanumeric string.`);
    }
  });

  // Optional fields (set to empty string to clear)
  ['description', 'events'].forEach((key) => {
    if (key_exists(key) && (isBoolean(payload[key]) || isNumber(payload[key]))) {
      throw new common.BadRequestError(`Action ${key} (if provided) must be a valid string.`);
    }
  });

  check_events(payload.events);

  try {
    await update_action(pg_pool, [action.action, payload.description, payload.events]);
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
      // payload.name ? `actions${payload.name}` : undefined,
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

async function http_runs_create(pg_pool, req, res, regex) {
  const app_key = http_helper.first_match(req.url, regex);
  const action_key = http_helper.second_match(req.url, regex);

  const created_by = req.headers['x-username'] || 'unknown';
  const action_run = await common.trigger_action(pg_pool, app_key, action_key, created_by, 'manual_trigger');

  return http_helper.created_response(res, action_run);
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

// Delete all actions. Normally called when deleting apps
async function delete_actions(pg_pool, app_key) {
  const app = await common.app_exists(pg_pool, app_key);
  const actions = await select_actions(pg_pool, [app.app_uuid]);

  await asyncForEach(actions, async (action) => {
    await formations.delete_dyno(pg_pool, app.app_uuid, app.app_name, app.space_name, action.formation.type);
    await delete_action(pg_pool, [action.action]);
  });
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
  delete_actions,
};
