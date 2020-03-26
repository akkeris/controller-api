const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const url = require('url');
const httph = require('./http_helper.js');
const query = require('./query.js');
const common = require('./common.js');
const config = require('./config.js');

const availableHooks = [
  {
    type: 'addon_change',
    description: 'Fired when an addon is provisioned or deprovisioned. This does not fire when addons are attached or de-attached.',
  },
  {
    type: 'build',
    description: 'Fired during a build pending, success, or failure event. This will fire at least twice per app (once when the build starts and once when it finishes).',
  },
  {
    type: 'config_change',
    description: 'Fired when a config var is added, removed, or updated. Only fired for user-defined config vars.',
  },
  {
    type: 'crashed',
    description: 'Fired when one or more dynos run out of memory, fails to start, does not accept requests, exits prematurely, or exits unexpectedly.',
  },
  {
    type: 'destroy',
    description: 'Fired when an app is permanently destroyed.',
  },
  {
    type: 'updated',
    description: 'Fired when an app is updated, (changes to its maintenace mode or meta data).',
  },
  {
    type: 'feature_change',
    description: 'Fired when there is a change to enable or disable a feature on an app.',
  },
  {
    type: 'formation_change',
    description: 'Fired when there is a scale event, or a new formation type is created.',
  },
  {
    type: 'logdrain_change',
    description: 'Fired when there is an addition or removal of log drains.',
  },
  {
    type: 'pipeline_promotion',
    description: 'Fired upon a successful pipeline promotion on the target apps in the pipeline coupling.',
  },
  {
    type: 'preview',
    description: 'Fired when a forked preview app is created. This event occurs on the source app prior to the preview app being released and ready.',
  },
  {
    type: 'preview-released',
    description: "Fired when a forked preview app is released. This event occurs on the source app when any code, configuration, or addon change happens on any of the app's previews.",
  },
  {
    type: 'release',
    description: 'Fired when a new release starts. This fires once per application.',
  },
  {
    type: 'released',
    description: 'Fired when an app has a new version and is now available for requests. This will fire once for each dyno type.',
  },
  {
    type: 'security_scan',
    description: 'Fired when an external security scanning service has something to report concerning the application.',
  },
];

function to_response(hook) {
  return {
    id: hook.hook,
    active: hook.active,
    events: hook.events.split(',').map((x) => x.trim()),
    created_at: hook.created.toISOString(),
    updated_at: hook.updated.toISOString(),
    url: common.socs({ URL: hook.url }).URL,
  };
}

function remove_params_url(uri) {
  const newURI = new url.URL(uri);
  return `${newURI.protocol}//${newURI.host}${newURI.pathname}`;
}

function remove_authorization_header(headers) {
  headers = headers || {};
  delete headers.authorization;
  delete headers.Authorization;
  return headers;
}

function to_result_response(hook_result) {
  try {
    hook_result.payload_body = JSON.parse(hook_result.payload_body);
  } catch (e) {
    // do nothing, leave as is.
  }
  try {
    hook_result.response_headers = JSON.parse(hook_result.response_headers);
  } catch (e) {
    // do nothing, leave as is.
  }
  try {
    hook_result.payload_headers = JSON.parse(hook_result.payload_headers);
  } catch (e) {
    // do nothing, leave as is.
  }
  return {
    id: hook_result.hook_result,
    last_attempt: {
      request: {
        method: 'post',
        url: remove_params_url(hook_result.url),
        headers: remove_authorization_header(hook_result.payload_headers),
        body: hook_result.payload_body,
      },
      response: {
        code: hook_result.response_code,
        headers: hook_result.response_headers,
        body: hook_result.response_payload,
      },
      status: (hook_result.response_code ? 'succeeded' : 'failed'),
      updated_at: hook_result.created.toISOString(),
    },
    num_attempts: 1,
    hook: {
      id: hook_result.hook,
      events: hook_result.events.split(',').map((x) => x.trim()),
    },
    created_at: hook_result.created.toISOString(),
  };
}

const select_hooks = query.bind(query, fs.readFileSync('./sql/select_hooks.sql').toString('utf8'), to_response);
const select_hook = query.bind(query, fs.readFileSync('./sql/select_hook.sql').toString('utf8'), to_response);
const update_hook = query.bind(query, fs.readFileSync('./sql/update_hook.sql').toString('utf8'), to_response);
const insert_hook = query.bind(query, fs.readFileSync('./sql/insert_hook.sql').toString('utf8'), to_response);
const delete_hook = query.bind(query, fs.readFileSync('./sql/delete_hook.sql').toString('utf8'), to_response);
const select_hook_results = query.bind(query, fs.readFileSync('./sql/select_hook_results.sql').toString('utf8'), to_result_response);
const select_hook_result = query.bind(query, fs.readFileSync('./sql/select_hook_result.sql').toString('utf8'), to_result_response);

async function hooks_list(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const hooks = await select_hooks(pg_pool, [app.app_uuid]);
  return httph.ok_response(res, JSON.stringify(hooks));
}

async function hooks_get(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  await common.app_exists(pg_pool, app_key);
  const hook_id = httph.second_match(req.url, regex);
  const hooks = await select_hook(pg_pool, [hook_id]);
  if (!hooks || hooks.length !== 1) {
    throw new common.NotFoundError('The specified hook was not found.');
  }
  return httph.ok_response(res, JSON.stringify(hooks[0]));
}

function check_hook(hook) {
  assert.ok(hook.events && Array.isArray(hook.events), 'The specified events is not an array or was not provided.');
  assert.ok(hook.url && hook.url !== '', 'The specified callback url was not provided.');
  assert.ok(hook.secret && hook.secret !== '', 'The specified secret was not provided.');
  assert.ok(hook.active === true || hook.active === false, 'The active flag on this hook must be either true or false.');
  assert.ok(hook.events.every((x) => availableHooks.findIndex((y) => y.type === x) !== -1),
    'One of the specified events was invalid.');
}

async function hooks_update(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  await common.app_exists(pg_pool, app_key);
  const hook_id = httph.second_match(req.url, regex);
  const payload = await httph.buffer_json(req);
  if (payload.events && !Array.isArray(payload.events)) {
    throw new common.BadRequestError('The specified events was not an array.');
  }
  if (typeof (payload.active) !== 'undefined' && payload.active !== true && payload.active !== false) {
    throw new common.BadRequestError('The specified payload active flag was neither true or false.');
  }
  if (typeof (payload.secret) !== 'undefined' && typeof (payload.secret) === 'string') {
    payload.secret = common.encrypt_token(config.encrypt_key, payload.secret);
  } else if (payload.secret) {
    throw new common.BadRequestError('The specified payload secret was not a string');
  }
  const hooks = await update_hook(pg_pool, [hook_id, payload.events ? payload.events.join(',') : null, payload.url, payload.secret, payload.active]);
  if (hooks.length === 0) {
    throw new common.NotFoundError('The specified hook was not found.');
  }
  return httph.ok_response(res, JSON.stringify(hooks[0]));
}

async function hooks_create(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const payload = await httph.buffer_json(req);
  const app = await common.app_exists(pg_pool, app_key);
  try {
    check_hook(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  const hook_id = uuid.v4();
  payload.secret = common.encrypt_token(config.encrypt_key, payload.secret);
  const hooks = await insert_hook(pg_pool, [hook_id, app.app_uuid, payload.url, payload.events.join(','), payload.secret, payload.active]);
  return httph.created_response(res, JSON.stringify(hooks[0]));
}

async function hooks_del(pg_pool, req, res, regex) {
  const hook = httph.second_match(req.url, regex);
  const hooks = await delete_hook(pg_pool, [hook]);
  if (!hooks || hooks.length === 0) {
    throw new common.NotFoundError('The specified hook was not found.');
  }
  return httph.no_content_response(res, JSON.stringify(hooks));
}

async function hooks_results(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const hook_id = httph.second_match(req.url, regex);
  return httph.ok_response(res,
    JSON.stringify(await select_hook_results(pg_pool, [app_key, hook_id]), null, 2));
}

async function hooks_result(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const hook_id = httph.second_match(req.url, regex);
  const hook_result_id = httph.third_match(req.url, regex);
  const results = await select_hook_result(pg_pool, [app_key, hook_id, hook_result_id]);
  if (!results || results.length !== 1) {
    throw new common.NotFoundError('The specified hook result was not found.');
  }
  return httph.ok_response(res,
    JSON.stringify(results[0], null, 2));
}

function hooks_descriptions(req, res) {
  return httph.ok_response(res, JSON.stringify(availableHooks));
}


module.exports = {
  get: hooks_get,
  list: hooks_list,
  update: hooks_update,
  create: hooks_create,
  delete: hooks_del,
  results: hooks_results,
  result: hooks_result,
  descriptions: hooks_descriptions,
};
