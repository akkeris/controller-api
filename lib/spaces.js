"use strict"

const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const config = require('./config.js');
const common = require('./common.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');

// private
function space_payload_to_postgres(payload) {
  return [payload.space, payload.stack_uuid, payload.created, payload.updated, payload.name, payload.description, payload.tags];
}

// private
function space_payload_to_response(payload) {
  return {
    "compliance":payload.tags.split(",").filter((x) => { return x.startsWith('compliance='); }).map((x) => { return x.replace('compliance=',''); }),
    "created_at":payload.created.toISOString(),
    "id":payload.space,
    "name":payload.name,
    "region":{
      "id":payload.region_uuid,
      "name":payload.region_name
    },
    "stack":{
      "id":payload.stack_uuid,
      "name":payload.stack_name
    },
    "state":"allocated",
    "apps":payload.num_apps,
    "updated_at":payload.updated.toISOString()
  };
}

// private
function space_postgres_to_response(payload) {
  return space_payload_to_response(payload);
}

// private
const select_space = query.bind(query, fs.readFileSync('./sql/select_space.sql').toString('utf8'), (n) => { return n; });
const insert_space = query.bind(query, fs.readFileSync('./sql/insert_space.sql').toString('utf8'), (n) => { return n; });
const select_spaces = query.bind(query, fs.readFileSync('./sql/select_spaces.sql').toString('utf8'), space_postgres_to_response);
//const update_space = query.bind(query, fs.readFileSync('./sql/update_space.sql').toString('utf8'), space_postgres_to_response);

// public
async function list(pg_pool, req, res, regex) {
  let data = await select_spaces(pg_pool, [])
  return http_help.ok_response(res, JSON.stringify(data))
}

// public
async function get(pg_pool, req, res, regex) {
  let space_key = http_help.first_match(req.url, regex)
  let space = await common.space_exists(pg_pool, space_key)
  let data = await select_space(pg_pool, [space.name])
  if(data.length === 0) {
    throw new common.NotFoundError('The specified space does not exist.')
  }
  return http_help.ok_response(res, JSON.stringify(space_postgres_to_response(data[0])));
}

// public
async function create(pg_pool, req, res, regex) {
  let reserved_spaces = ["kube-system", "brokers", "k2-poc", "kube-public"]
  let payload = await http_help.buffer_json(req)
  if(!payload.name || /(^[A-z0-9\-]+$)/.exec(payload.name) === null) {
    throw new common.UnprocessibleEntityError('The specified request did not contain, or contained an invalid "name" field.')
  }

  // reserved names, change to array
  if(reserved_spaces.some((x) => x.toLowerCase() === payload.name.toLowerCase())) {
    throw new common.ConflictError('The specified space is an invalid or reserved name.')
  }

  // assign default stack if one doesnt exist
  let stack = null
  if(!payload.stack) {
    stack = await common.alamo.default_stack(pg_pool)
  } else {
    stack = await common.alamo.stack(pg_pool, payload.stack)
  }
  if(!stack) {
    throw new common.NotFoundError(`The specified stack ${payload.stack} does not exist.`)
  }
  payload.stack_uuid = stack.stack
  payload.stack_name = stack.name
  payload.region_name = stack.region_name
  payload.region_uuid = stack.region_uuid

  // ensure we're not deprecated in this stack
  if(stack.deprecated) {
    throw new common.ConflictError('The specified region or stack has been deprecated.')
  }

  // see if its in the database already
  let data = await select_space(pg_pool, [payload.name])
  if(data.length !== 0) {
    throw new common.ConflictError("The specified space already exists.")
  }

  // Search for creation-time compliance tags such as internal.
  let internal = false, prod = false;
  if (payload.compliance) {
    if (Array.isArray(payload.compliance)) {
      for (let i = 0; i < payload.compliance.length; i++) {
        if (payload.compliance[i] === 'internal') {
          internal = true;
        } else if (payload.compliance[i] === 'prod') {
          prod = true;
        }
        if (/(^[A-z0-9\-]+$)/.exec(payload.compliance[i]) === null) {
          throw new common.UnprocessibleEntityError(`The specified compliance value ${payload.compliance[i]} is an invalid complaince, must be alphanumeric.`)
        }
      }
      payload.tags = payload.compliance.map((x) => { return `compliance=${x}`; }).join(',');
    } else {
      throw new common.UnprocessibleEntityError("The specified compliance field must be an array of compliance strings.")
    }
  } else {
    payload.tags = '';
  }

  // Ensure we respect private vs. public stack/region
  if(internal === true && stack.private_capable === false) {
    throw new common.ConflictError('The specified stack and region is not capable of an private spaces.')
  }

  // Do not allow prod spaces in beta stacks
  if(prod === true && stack.beta === true) {
    throw new common.ConflictError('The specified stack is not yet generally availalble, but in beta. A production space cannot be provisioned on beta systems.')
  }

  // see if alamo believes it exists.
  let spaces = await common.alamo.spaces.list(pg_pool)
  if(spaces.some((space) => { return space === payload.name; })) {
    throw new common.ConflictError("The specified space already exists.");
  }

  payload.description = payload.description || '';
  payload.space = uuid.v4();
  payload.updated = payload.created = new Date();

  if(process.env.TEST_MODE) {
    return http_help.ok_response(res, JSON.stringify({test:"did not create a space, but successful. internal = " + internal}))
  }
  // Record the provision
  await insert_space(pg_pool, space_payload_to_postgres(payload))
  // see if we can provision it
  await common.alamo.spaces.create(pg_pool, payload.name, internal)
  return http_help.ok_response(res, JSON.stringify(space_payload_to_response(payload)));
}

module.exports = {get, create, list};
