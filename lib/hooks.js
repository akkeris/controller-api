const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const query = require('./query.js');
const common = require('./common.js');

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

let select_hooks = query.bind(query, fs.readFileSync('./sql/select_hooks.sql').toString('utf8'), to_response);
let select_hook = query.bind(query, fs.readFileSync('./sql/select_hook.sql').toString('utf8'), to_response);
let update_hook = query.bind(query, fs.readFileSync('./sql/update_hook.sql').toString('utf8'), to_response);
let insert_hook = query.bind(query, fs.readFileSync('./sql/insert_hook.sql').toString('utf8'), to_response);
let delete_hook = query.bind(query, fs.readFileSync('./sql/delete_hook.sql').toString('utf8'), to_response);

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

async function hooks_list_results(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let hook_id = httph.second_match(req.url, regex);
  // TODO: finish me.
}

async function hooks_reply(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let hook_id = httph.second_match(req.url, regex);
  let hook_result_id = httph.third_match(req.url, regex);
  // TODO: finish me.

}


module.exports = {
  get: hooks_get,
  list: hooks_list,
  update: hooks_update,
  create: hooks_create,
  delete: hooks_del
};