const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const query = require('./query.js');
const common = require('./common.js');
const url = require('url')

function to_response(hook) {
  return {
    id:hook.hook,
    active:hook.active,
    events:hook.events.split(',').map((x) => { return x.trim(); }),
    created_at:hook.created.toISOString(),
    updated_at:hook.updated.toISOString(),
    url:hook.url
  }
}

function remove_params_url(uri) {
  uri = url.parse(uri)
  return `${uri.protocol}//${uri.host}${uri.path}`
}

function remove_authorization_header(headers) {
  headers = headers || {}
  delete headers.authorization
  delete headers.Authorization
  return headers
}

function to_result_response(hook_result) {
  try {
    hook_result.payload_body = JSON.parse(hook_result.payload_body)
  } catch (e) {
    // do nothing, leave as is.
  }
  try {
    hook_result.response_headers = JSON.parse(hook_result.response_headers)
  } catch (e) {
    // do nothing, leave as is.
  }
  try {
    hook_result.payload_headers = JSON.parse(hook_result.payload_headers)
  } catch (e) {
    // do nothing, leave as is.
  }
  return {
    "id":hook_result.hook_result,
    "last_attempt":{
      "request":{
        "method":"post",
        "url":remove_params_url(hook_result.url),
        "headers":remove_authorization_header(hook_result.payload_headers),
        "body":hook_result.payload_body
      },
      "response":{
        "code":hook_result.response_code,
        "headers":hook_result.response_headers,
        "body":hook_result.response_payload
      },
      "status":(hook_result.response_code ? "succeeded" : "failed"),
      "updated_at":hook_result.created.toISOString()
    },
    "num_attempts":1,
    "hook":{
      "id":hook_result.hook,
      "events":hook_result.events.split(',').map((x) => { return x.trim(); }),
    },
    "created_at":hook_result.created.toISOString(),
  }
}

let select_hooks = query.bind(query, fs.readFileSync('./sql/select_hooks.sql').toString('utf8'), to_response);
let select_hook = query.bind(query, fs.readFileSync('./sql/select_hook.sql').toString('utf8'), to_response);
let update_hook = query.bind(query, fs.readFileSync('./sql/update_hook.sql').toString('utf8'), to_response);
let insert_hook = query.bind(query, fs.readFileSync('./sql/insert_hook.sql').toString('utf8'), to_response);
let delete_hook = query.bind(query, fs.readFileSync('./sql/delete_hook.sql').toString('utf8'), to_response);
let select_hook_results = query.bind(query, fs.readFileSync('./sql/select_hook_results.sql').toString('utf8'), to_result_response);
let select_hook_result = query.bind(query, fs.readFileSync('./sql/select_hook_result.sql').toString('utf8'), to_result_response);

async function hooks_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let hooks = await select_hooks(pg_pool, [app.app_uuid])
  return httph.ok_response(res, JSON.stringify(hooks))
}

async function hooks_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let hook_id = httph.second_match(req.url, regex)
  let hooks = await select_hook(pg_pool, [hook_id])
  if (!hooks || hooks.length !== 1) {
    throw new common.NotFoundError(`The specified hook was not found.`)
  }
  return httph.ok_response(res, JSON.stringify(hooks[0]));
}


function check_hook(hook) {
  console.assert(hook.events && Array.isArray(hook.events), 'The specified events is not an array or was not provided.');
  console.assert(hook.url && hook.url !== '', 'The specified callback url was not provided.');
  console.assert(hook.secret && hook.secret !== '', 'The specified secret was not provided.');
  console.assert(hook.active === true || hook.active === false, 'The active flag on this hook must be either true or false.');
  let allowed_events = [
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy",
    "crashed",
    "released",
    "preview"
  ];
  console.assert(hook.events.every((x) => { return allowed_events.indexOf(x) !== -1; }),
    'One of the specified events was invalid.');
}

async function hooks_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let hook_id = httph.second_match(req.url, regex)
  let payload = await httph.buffer_json(req)
  if(payload.events && !Array.isArray(payload.events)) {
    throw new common.BadRequestError('The specified events was not an array.');
  }
  if(typeof(payload.active) !== 'undefined' && payload.active !== true && payload.active !== false) {
    throw new common.BadRequestError('The specified payload active flag was neither true or false.')
  }
  let hooks = await update_hook(pg_pool, [hook_id, payload.events ? payload.events.join(',') : null, payload.url, payload.secret, payload.active])
  if (hooks.length === 0) {
    throw new common.NotFoundError(`The specified hook was not found.`)
  }
  return httph.ok_response(res, JSON.stringify(hooks[0]))
}

async function hooks_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let payload = await httph.buffer_json(req)
  let app = await common.app_exists(pg_pool, app_key)
  try {
    check_hook(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let hook_id = uuid.v4();
  let created_updated = new Date();
  payload.secret = common.encrypt_token(process.env.ENCRYPT_KEY, payload.secret);
  let hooks = await insert_hook(pg_pool, [hook_id, app.app_uuid, payload.url, payload.events.join(','), payload.secret, payload.active])
  return httph.created_response(res, JSON.stringify(hooks[0]));
}

async function hooks_del(pg_pool, req, res, regex){
  let hook = httph.second_match(req.url, regex)
  let hooks = await delete_hook(pg_pool, [hook])
  if(!hooks || hooks.length === 0) {
    throw new common.NotFoundError(`The specified hook was not found.`)
  }
  return httph.no_content_response(res)
}

async function hooks_results(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let hook_id = httph.second_match(req.url, regex);
  return httph.ok_response(res, 
      JSON.stringify(await select_hook_results(pg_pool, [app_key, hook_id]), null, 2))
}

async function hooks_result(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let hook_id = httph.second_match(req.url, regex);
  let hook_result_id = httph.third_match(req.url, regex);
  let results = await select_hook_result(pg_pool, [app_key, hook_id, hook_result_id])
  if(!results || results.length !== 1) {
    throw new common.NotFoundError(`The specified hook result was not found.`)
  }
  return httph.ok_response(res, 
      JSON.stringify(results[0], null, 2))
}


module.exports = {
  get: hooks_get,
  list: hooks_list,
  update: hooks_update,
  create: hooks_create,
  delete: hooks_del,
  results: hooks_results,
  result: hooks_result
};