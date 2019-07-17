"use strict";

const fs = require('fs');
const query = require('./query.js');
const httph = require('./http_helper.js');
const uuid = require('uuid');
const common = require('./common.js');
const assert = require('assert');
//const lifecycle = require('./lifecycle.js');
const logs = require('./log-drains.js');

function filter_to_response(payload) {
  let response = {
    "created_at":payload.created.toISOString(),
    "description":payload.description,
    "id":payload.filter,
    "options":payload.options,
    "name":payload.name,
    "type":payload.type,
    "organization":{
      "id":payload.organization,
    },
    "updated_at":payload.updated.toISOString(),
  }
  return response
}

function filter_attachment_to_response(payload) {
  return {
    "created_at":payload.created.toISOString(),
    "filter":{
      "id":payload.filter,
    },
    "app":{
      "id":payload.app,
    },
    "id":payload.filter_attachment,
    "options":payload.attachment_options,
    "updated_at":payload.updated.toISOString(),
  }
}

function to_filter_attachment_data(filter, payload) {
  return payload.options || {}
}

function to_filter_data(payload) {
  if(payload.type === "jwt") {
    assert.ok(payload.options, "No options was passed in for type jwt.")
    assert.ok(payload.options.jwks_uri, "The jwks_uri value must be set for this filter.")
    assert.ok(payload.options.issuer, "The issuer value must be set for this filter.")
    if(payload.options.audiences && !Array.isArray(payload.options.audiences)) {
      payload.options.audiences = payload.options.audiences.toString().split(",")
    }
    return {
      "audiences":payload.options.audiences,
      "jwks_uri":payload.options.jwks_uri,
      "issuer":payload.options.issuer,
    }
  } else {
    assert.ok(false, "The filter type was unrecognized.")
  }
}

let select_filters = query.bind(query, fs.readFileSync('./sql/select_filters.sql').toString('utf8'), filter_to_response);
let select_filter = query.bind(query, fs.readFileSync('./sql/select_filter.sql').toString('utf8'), filter_to_response);
let delete_filter = query.bind(query, fs.readFileSync('./sql/delete_filter.sql').toString('utf8'), filter_to_response);
let create_filter = query.bind(query, fs.readFileSync('./sql/insert_filter.sql').toString('utf8'), filter_to_response);
let update_filter = query.bind(query, fs.readFileSync('./sql/update_filter.sql').toString('utf8'), filter_to_response);

let select_attachments = query.bind(query, fs.readFileSync('./sql/select_filter_attachments.sql').toString('utf8'), filter_attachment_to_response);
let select_attachment = query.bind(query, fs.readFileSync('./sql/select_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);
let delete_filter_attachment = query.bind(query, fs.readFileSync('./sql/delete_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);
let insert_filter_attachment = query.bind(query, fs.readFileSync('./sql/insert_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);
let update_filter_attachment = query.bind(query, fs.readFileSync('./sql/update_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);

async function http_filters_get(pg_pool, req, res, regex) {
  let filter_key = httph.first_match(req.url, regex)
  let filters = await select_filter(pg_pool, [filter_key])
  return httph.ok_response(res, JSON.stringify(filters[0]));
}

async function http_filters_list(pg_pool, req, res, regex) {
  let filters = await select_filters(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(filters));
}

async function http_filters_del(pg_pool, req, res, regex) {
  if(!req.headers['x-username'] || !req.headers['x-elevated-access']) {
    throw new common.UnauthorizedError("Removing filters requires elevated access privileges.")
  }
  let filter_key = httph.first_match(req.url, regex)
  let filters = await select_filter(pg_pool, [filter_key]);
  if(filters.length !== 1) {
    throw new common.NotFoundError(`The specified filter was not found (${filter_key}).`)
  }
  await delete_filter(pg_pool, [filters[0].id])
  return httph.no_content_response(res, JSON.stringify(filters));
}

async function http_filters_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let options = {}
  try {
    assert.ok(payload.name, 'The filters name was not provided.')
    assert.ok(payload.description, 'The filters description was not provided.')
    assert.ok(payload.type && payload.type === "jwt", 'The filters type was not provided or was an invalid value.')
    assert.ok(payload.organization, 'The organization was not provided.')
    if(payload.organization.id) {
      payload.organization = payload.organization.id;
    } else {
      let org = await common.org_exists(pg_pool, payload.organization);
      payload.organization = org.org;
    }
    options = to_filter_data(payload);
  } catch (e) {
    throw new common.BadRequestError(e.message)
  }
  let filters = await select_filter(pg_pool, [payload.name])
  if (filters.length > 0) {
    throw new common.ConflictError("A filter by this name already exists.")
  }
  filters = await create_filter(pg_pool, [payload.name, payload.type, payload.description, options, payload.organization, req.headers['x-username']])
  filters = await select_filter(pg_pool, [filters[0].id])
  return httph.created_response(res, JSON.stringify(filters[0]));
}

async function http_filters_update(pg_pool, req, res, regex) {
  if(!req.headers['x-username'] || !req.headers['x-elevated-access']) {
    throw new common.UnauthorizedError("Updating filters requires elevated access privileges.")
  }
  let payload = await httph.buffer_json(req)
  let filter_key = httph.first_match(req.url, regex)
  let filters = await select_filter(pg_pool, [filter_key])
  let options = {}
  try {
    assert.ok(payload.name, 'The filters name was not provided.')
    assert.ok(payload.description, 'The filters description was not provided.')
    assert.ok(payload.type && payload.type === "jwt", 'The filters type was not provided or was an invalid value.')
    options = to_filter_data(payload);
  } catch (e) {
    throw new common.BadRequestError(e.message)
  }
  if(filters.length === 1) {
    filters = await update_filter(pg_pool, [filters[0].id, payload.name, payload.type, payload.description, options])
    return httph.ok_response(res, JSON.stringify(filters[0]));
  } else {
    throw new common.NotFoundError(`The specified filter was not found.`)
  }
}

async function http_filter_list_attachments(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let attachments = await get_attachments(pg_pool, app.app_uuid);
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function http_filter_get_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let filter_attachment_key = httph.second_match(req.url, regex);
  let attachments = await get_attachment(pg_pool, app.app_uuid, filter_attachment_key);
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function http_filter_delete_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let filter_attachment_key = httph.second_match(req.url, regex);
  let attachment = await get_attachment(pg_pool, app.app_uuid, filter_attachment_key);
  await delete_attachment(pg_pool, attachment.id);
  let attachments = await get_attachments(pg_pool, app.app_uuid);
  logs.event(pg_pool, app.app_name, app.space_name, "Detached filter " + attachment.id);
  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'filter_detachment', JSON.stringify({
      'action':'filter_detachment',
      'app':{
        'name':app.app_name,
        'id':app.app_uuid
      },
      'space':{
        'name':app.space_name
      },
      'filter_attachment_id':attachment.id
    }), req.headers['x-username'] ? req.headers['x-username'] : "System"); 
    //lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'HTTP Filter Dettached').catch((err) => { /* do nothing */ });
  }, 10);
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function http_filter_create_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let payload = await httph.buffer_json(req);
  let filter = null
  let attachment_options = {}
  try {
    assert.ok(payload.options, "The filter object options was not found.");
    assert.ok(payload.filter, "The filter object was not found.");
    assert.ok(payload.filter.id, "The filter id was not found.");
    filter = await select_filter(pg_pool, [payload.filter.id]);
    assert.ok(filter.length === 1, 'The specified filter was not found.');
    filter = filter[0];
    attachment_options = to_filter_attachment_data(filter, payload);
  } catch (e) {
    throw new common.BadRequestError(e.message)
  }
  let attachment = await create_attachment(pg_pool, app.app_uuid, payload.filter.id, attachment_options, req.headers['x-username']);
  logs.event(pg_pool, app.app_name, app.space_name, "Attached filter " + payload.filter.id);
  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'filter_attachment', JSON.stringify({
      'action':'filter_attachment',
      'app':{
        'name':app.app_name,
        'id':app.app_uuid
      },
      'space':{
        'name':app.space_name
      },
      'changes':payload,
      'filter_attachment_id':attachment.id
    }), req.headers['x-username'] ? req.headers['x-username'] : "System"); 
    //lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'HTTP Filter Attached').catch((err) => { /* do nothing */ });
  }, 10);
  return httph.created_response(res, JSON.stringify(attachment));
}

async function http_filter_update_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let filter_attachment_key = httph.second_match(req.url, regex);
  let attachment = await get_attachment(app.app_uuid, filter_attachment_key);
  let payload = await httph.buffer_json(req);
  let attachment_options = {}
  try {
    assert.ok(payload.filter, "The filter object was not found.")
    assert.ok(payload.filter.id, "The filter id was not found.")
    attachment_options = to_filter_attachment_data(attachment.filter, payload)
  } catch (e) {
    throw new common.BadRequestError(e.message)
  }
  logs.event(pg_pool, app.app_name, app.space_name, "Updated filter attachment " + attachment.id);
  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'filter_attachment_update', JSON.stringify({
      'action':'filter_attachment_update',
      'app':{
        'name':app.app_name,
        'id':app.app_uuid
      },
      'space':{
        'name':app.space_name
      },
      'changes':payload,
      'filter_attachment_id':attachment.id
    }), req.headers['x-username'] ? req.headers['x-username'] : "System"); 
    //lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'HTTP Filters Changed').catch((err) => { /* do nothing */ });
  }, 10);
  return httph.ok_response(res, 
    JSON.stringify(await update_attachment(pg_pool, app.app_uuid, attachment.id, payload.filter.id, attachment_options)));
}

async function create_attachment(pg_pool, app_uuid, filter_id, options, user) {
  let attachment = await insert_filter_attachment(pg_pool, [app_uuid, filter_id, options, user]);
  let filters = await select_filter(pg_pool, [attachment[0].filter.id])
  attachment[0].filter = filters[0]
  return attachment[0]
}

async function update_attachment(pg_pool, app_uuid, filter_attachment_id, filter_id, options) {
  let attachment = await update_filter_attachment(pg_pool, [filter_attachment_id, app_uuid, filter_id, options]);
  if (attachment.length === 0) {
    throw new common.NotFoundError("The specified attachment was not found.");
  }
  let filters = await select_filter(pg_pool, [attachment[0].filter])
  attachment[0].filter = filters[0]
  return attachment[0];
}

async function delete_attachment(pg_pool, filter_attachment_id) {
  return await delete_filter_attachment(pg_pool, [filter_attachment_id]);
  if (attachment.length === 0) {
    throw new common.NotFoundError("The specified attachment was not found.");
  }
  let filters = await select_filter(pg_pool, [attachment[0].filter.id])
  attachment[0].filter = filters[0]
  return attachment[0];
}

async function get_attachments(pg_pool, app_uuid) {
  let attachments = await select_attachments(pg_pool, [app_uuid]);
  return await Promise.all(attachments.map(async (x) => {
    let filters = await select_filter(pg_pool, [x.filter.id])
    x.filter = filters[0]
    return x
  }))
}

async function get_attachment(pg_pool, app_uuid, filter_attachment_id) {
  let attachment = await select_attachment(pg_pool, [app_uuid, filter_attachment_id]);
  if (attachment.length === 0) {
    throw new common.NotFoundError("The specified attachment was not found.");
  }
  let filters = await select_filter(pg_pool, [attachment[0].filter.id])
  attachment[0].filter = filters[0]
  return attachment[0];
}

async function deployment_filters(pg_pool, app_uuid, dyno_type) {
  if(dyno_type !== "web") {
    return []
  }
  return (await get_attachments(pg_pool, app_uuid))
    .map((x) => { 
      if(x.filter.type === "jwt") {
        return {
          "type":"jwt",
          "data":{
            "audiences":x.filter.options.audiences,
            "jwks_uri":x.filter.options.jwks_uri,
            "issuer":x.filter.options.issuer,
            "excludes":x.options.excludes,
          }
        }
      } else {
        throw new Error('Invalid filter type: ' + x.filter.type)
      }
    });
}

module.exports = {
  "http":{
    "get": http_filters_get,
    "list": http_filters_list,
    "delete": http_filters_del,
    "create": http_filters_create,
    "update": http_filters_update,
    "attach":{
      "list": http_filter_list_attachments,
      "get": http_filter_get_attachment,
      "delete": http_filter_delete_attachment,
      "create": http_filter_create_attachment,
      "update": http_filter_update_attachment,
    }
  },
  create_attachment,
  update_attachment,
  delete_attachment,
  get_attachments,
  deployment_filters,
}