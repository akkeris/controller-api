"use strict";

const fs = require('fs');
const query = require('./query.js');
const httph = require('./http_helper.js');
const uuid = require('uuid');
const common = require('./common.js');
const assert = require('assert');

function filter_to_response(payload) {
  let response = {
    "created_at":payload.created.toISOString(),
    "description":payload.description,
    "id":payload.id,
    "options":payload.options,
    "name":payload.name,
    "type":payload.type,
    "updated_at":payload.updated.toISOString(),
  }
  return response
}

function filter_instance_to_response(payload) {
  return {
    "created_at":payload.created.toISOString(),
    "filter":{
      "id":payload.filter_id,
      "type":payload.filter_type,
      "options":payload.filter_options,
    },
    "id":payload.filter_id,
    "options":payload.options,
    "updated_at":payload.updated.toISOString(),
  }
}

function to_filter_instance_data(filter, payload) {
  return payload.filter.options
}

function to_filter_data(payload) {
  if(payload.type === "jwt") {
    assert.ok(payload.jwks_uri, "The jwks_uri value must be set for this filter.")
    assert.ok(payload.issuer, "The issuer value must be set for this filter.")
    if(payload.audiences && !Array.isArray(payload.audiences)) {
      payload.audiences = payload.audiences.toString().split(",")
    }
    return {
      "audiences":payload.audiences,
      "jwks_uri":payload.jwks_uri,
      "issuer":data.issuer,
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

let select_attachments = query.bind(query, fs.readFileSync('./sql/select_filter_attachments.sql').toString('utf8'), filter_instance_to_response);
let select_attachment = query.bind(query, fs.readFileSync('./sql/select_filter_attachment.sql').toString('utf8'), filter_instance_to_response);
let delete_filter_attachment = query.bind(query, fs.readFileSync('./sql/delete_filter_attachment.sql').toString('utf8'), filter_instance_to_response);
let insert_filter_attachment = query.bind(query, fs.readFileSync('./sql/insert_filter_attachment.sql').toString('utf8'), filter_instance_to_response);
let update_filter_attachment = query.bind(query, fs.readFileSync('./sql/update_filter_attachment.sql').toString('utf8'), filter_instance_to_response);

async function http_filters_get(pg_pool, req, res, regex) {
  let filter_key = httph.first_match(req.url, regex)
  let filters = await select_filters(pg_pool, [filter_key])
  return httph.ok_response(res, JSON.stringify(filters));
}

async function http_filters_list(pg_pool, req, res, regex) {
  let filters = await select_filters(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(filters));
}

async function http_filters_del(pg_pool, req, res, regex) {
  let filter_key = httph.first_match(req.url, regex)
  let filters = delete_filter(pg_pool, [filter_key])
  if(filters.length === 0) {
    throw new common.NotFoundError(`The specified filter was not found (${filter_key}).`)
  }
  return httph.no_content_response(res, JSON.stringify(filters));
}

async function http_filters_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let created_updated = new Date();
  let filters = await select_filter(pg_pool, [payload.name])
  if(filters.length > 0) {
    filters = await update_filter(pg_pool, [created_updated, filters[0].id, payload.name, payload.type, payload.description, to_filter_data(payload)])
    if(filters.length === 0) {
      throw new common.NotFoundError(`The specified filter was not found.`)
    }
    return httph.created_response(res, JSON.stringify(filters[0]));
  } else {
    let filter_id = uuid.v4();
    await create_filter(pg_pool, [filter_id, payload.name, payload.type, payload.description, false, created_updated, created_updated, to_filter_data(payload)])
    filters = await select_filter(pg_pool, [filter_id])
    return httph.created_response(res, JSON.stringify(filters[0]));
  }
}

async function http_filter_get_attachments(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let filter_attachment_key = httph.second_match(req.url, regex);
  let attachments = await get_attachments(pg_pool, app.id);
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function http_filter_delete_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let filter_attachment_key = httph.second_match(req.url, regex);
  let attachment = await get_attachment(pg_pool, app.id, filter_attachment_key);
  await delete_attachment(app.id, attachment.id);
  let attachments = await get_attachments(pg_pool, app.id);
  // todo: redeploy app
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function http_filter_create_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let payload = await httph.buffer_json(req);
  assert.ok(payload.filter, "The filter object was not found.");
  assert.ok(payload.filter.id, "The filter id was not found.");
  let filter = await select_filters(pg_pool, [payload.filter.id]);
  // todo: redeploy app
  return httph.created_response(res, 
    JSON.stringify(await create_attachment(pg_pool, app.id, payload.filter.id, to_filter_instance_data(filter[0], payload))));
}

async function http_filter_update_attachment(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let payload = await httph.buffer_json(req);
  assert.ok(payload.filter, "The filter object was not found.")
  assert.ok(payload.filter.id, "The filter id was not found.")
  let filter_attachment_key = httph.second_match(req.url, regex);
  let attachment = await get_attachment(app.id, filter_attachment_key);
  let filter = await select_filters(pg_pool, [payload.filter.id]);
  // todo: redeploy app
  return httph.ok_response(res, 
    JSON.stringify(await update_attachment(pg_pool, app.id, attachment.id, payload.filter.id, to_filter_instance_data(filter[0], payload))));
}

async function create_attachment(pg_pool, app_uuid, filter_id, options) {
  return await insert_filter_attachment(pg_pool, [app_uuid, filter_id, options]);
}

async function update_attachment(pg_pool, app_uuid, filter_attachment_id, filter_id, options) {
  let attachment = await update_filter_attachment(pg_pool, [app_uuid, filter_attachment_id, filter_id, options]);
  if (attachment.length === 0) {
    throw new common.NotFoundError("The specified attachment was not found.");
  }
  return attachment[0];
}

async function delete_attachment(pg_pool, filter_attachment_id) {
  return await delete_filter_attachment(pg_pool, [filter_attachment_id]);
  if (attachment.length === 0) {
    throw new common.NotFoundError("The specified attachment was not found.");
  }
  return attachment[0];
}

async function get_attachments(pg_pool, app_uuid) {
  return await select_attachments(pg_pool, [app_uuid]);
}

async function get_attachment(pg_pool, app_uuid, filter_attachment_id) {
  let attachment = await select_attachment(pg_pool, [app_uuid, filter_attachment_id]);
  if (attachment.length === 0) {
    throw new common.NotFoundError("The specified attachment was not found.");
  }
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
          "audiences":x.filter.options.audiences,
          "jwks_uri":x.filter.options.jwks_uri,
          "issuer":x.filter.options.issuer,
          "excludes":x.options.excludes,
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
      "get": http_filter_get_attachments,
      "delete": http_filter_delete_attachment,
      "create": http_filter_create_attachment,
      "update": http_filter_update_attachment,
    }
  },
  "create_attachment":create_attachment,
  "update_attachment":update_attachment,
  "delete_attachment":delete_attachment,
  "get_attachments":get_attachments,
  "deployment_filters":deployment_filters,
}