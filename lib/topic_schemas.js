"use strict"

const common = require('./common.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');
const fs = require('fs');

async function list_mappings(pg_pool, req, res, regex) {
  let data = await select_clusters(pg_pool, []);
  return http_help.ok_response(res, data);
}

async function delete_mapping(pg_pool, req, res, regex) {
  let data = await select_clusters(pg_pool, []);
  return http_help.ok_response(res, data);
}

async function create_mapping(pg_pool, req, res, regex) {
  let data = await select_clusters(pg_pool, []);
  return http_help.ok_response(res, data);
}

module.exports = {
  list_mappings,
  create_mapping,
  delete_mapping
};
