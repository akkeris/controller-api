"use strict"

const fs = require('fs');
const crypto = require('crypto');
const uuid = require('uuid');
const httph = require('./http_helper.js')
const query = require('./query.js');
const common = require('./common.js');

function to_response(db_row) {
  return {
    "created_at": (new Date(db_row.created)).toISOString(),
    "id": db_row.stack,
    "name": db_row.name,
    "region":{
      "id":db_row.region_uuid,
      "name":db_row.region_name
    },
    "state":db_row.beta === true ? "beta" : db_row.deprecated === true ? "deprecated" : "public",
    "updated_at": (new Date(db_row.updated)).toISOString()
  }
}

const select_stacks = query.bind(query, fs.readFileSync('./sql/select_stacks.sql').toString('utf8'), to_response);
const insert_stack = query.bind(query, fs.readFileSync('./sql/insert_stack.sql').toString('utf8'), to_response);
const update_stack = query.bind(query, fs.readFileSync('./sql/update_stack.sql').toString('utf8'), to_response);
const delete_stack = query.bind(query, fs.readFileSync('./sql/delete_stack.sql').toString('utf8'), to_response);

async function list(pg_pool) {
  return await select_stacks(pg_pool, [])
}

async function update(pg_pool, stack_uuid, beta, deprecated) {
  let updated_stack = await update_stack(pg_pool, [stack_uuid, (beta === true || beta === false) ? beta : null, (deprecated === true || deprecated === false) ? deprecated : null ])
  if(updated_stack.length !== 1) {
    throw new common.InternalServerError('An unexpected error occured updating this stacks record.')
  }
  return await updated_stack[0]
}

async function create(pg_pool, region_uuid, name, beta, deprecated) {
  try {
    console.assert(name && name !== '', 'The stacks name was not provided and is required.')
    console.assert(/^[A-z0-9\-]+$/.exec(name) !== null && name.length < 32, 'The stack name was invalid, it must be an alpha numeric and may contain a hyphen.')
    console.assert(region_uuid || region_uuid === '', 'The specified region was not provided.')
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let stack = await common.stack_exists(pg_pool, name, true);
  if(stack) {
    throw new common.ConflictError(`The stack ${name} already exists.`)
  }
  let region = await common.region_exists(pg_pool, region_uuid);
  let params = [uuid.v4(), region.region, name, beta, deprecated];
  let new_stack = await insert_stack(pg_pool, params)
  if(new_stack.length !== 1) {
    throw new common.InternalServerError('An unexpected error occured creating this stacks record.')
  }
  new_stack[0].region = {
    "id":region.region,
    "name":region.name
  }
  return new_stack[0]
}

async function http_update(pg_pool, req, res, exp) {
  if(req.headers['x-username']) {
    throw new common.NotAllowedError('This operation is only allowed by administrators.')
  }
  let stack = await common.stack_exists(pg_pool, 
    httph.first_match(req.url, exp))
  let payload = await httph.buffer_json(req)
  let stack_new = await update(pg_pool, stack.stack, payload.state === 'beta' ? true : false, payload.state === 'deprecated' ? true : false)
  stack_new.region.id = stack.region_uuid
  stack_new.region.name = stack.region_name
  return httph.ok_response(res, JSON.stringify(stack_new))
}

async function http_create(pg_pool, req, res, exp) {
  if(req.headers['x-username']) {
    throw new common.NotAllowedError('This operation is only allowed by administrators.')
  }
  let payload = await httph.buffer_json(req)
  if(!payload.region || !payload.region.id) {
    throw new common.UnprocessibleEntityError('The specified region was not provided.')
  }
  return httph.created_response(res, 
    JSON.stringify(await create(pg_pool, payload.region ? payload.region.id : '', payload.name,  payload.state === 'beta' ? true : false, payload.state === 'deprecated' ? true : false)))
}

async function http_delete(pg_pool, req, res, exp) {
  if(req.headers['x-username']) {
    throw new common.NotAllowedError('This operation is only allowed by administrators.')
  }
  let stack = await common.stack_exists(pg_pool, httph.first_match(req.url, exp))
  let deleted_stack = await delete_stack(pg_pool, [stack.stack])
  if(deleted_stack.length !== 1) {
    throw new common.InternalServerError('An unexpected error occured deleting this stacks record.')
  }
  deleted_stack[0].region = {
    "id":stack.region_uuid,
    "name":stack.region_name
  }
  return httph.ok_response(res, JSON.stringify(deleted_stack[0]))
}

async function http_list(pg_pool, req, res, exp) {
  return httph.ok_response(res, JSON.stringify(await list(pg_pool)))
}

async function http_get(pg_pool, req, res, exp) {
  return httph.ok_response(res, 
    JSON.stringify(to_response(await common.stack_exists(pg_pool, 
      httph.first_match(req.url, exp)))))
}

module.exports = {
  get:common.stack_exists,
  list,
  create,
  update,
  delete:delete_stack,
  http:{
    delete:http_delete,
    create:http_create,
    update:http_update,
    list:http_list,
    get:http_get
  }
}