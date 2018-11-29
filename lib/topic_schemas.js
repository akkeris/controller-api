"use strict"

const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');
const fs = require('fs');

async function list_schemas(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  if (!cluster_key || !/[^-]+-(.+)/.test(cluster_key))
    throw new common.UnprocessibleEntityError('Provide cluster name in "cluster-region" format.');
  
  let [_, cluster, region] = cluster_key.match('([^-]+)-(.+)');
  let {cluster} = await common.cluster_exists(pg_pool, cluster_key);
  let data = await common.alamo.topic_schemas.get(region, cluster);
  return httph.ok_response(res, data.schemas.sort((a, b) => {
    if (a < b) -1;
    else if (b < a) 1;
    else 0;
  }));
}

async function list_mappings(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let topic_key = httph.second_match(req.url, regex);
  let [_, cluster, region] = cluster_key.match('([^-]+)-(.+)');

  let {name: topic_name} = await common.topic_exists(pg_pool, topic_key, cluster_key);

  let data = await common.alamo.topic_schemas.get_mappings(region, cluster, topic_name);
  return httph.ok_response(res, data.schemas);
}

async function create_key_mapping(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let topic_key = httph.second_match(req.url, regex);
  let {keytype, schema} = await httph.buffer_json(req);
  let [_, cluster, region] = cluster_key.match('([^-]+)-(.+)');

  let {name: topic_name} = await common.topic_exists(pg_pool, topic_key, cluster_key);

  let data = await common.alamo.topic_schemas.create_key_mapping(region, cluster, topic_name, keytype, schema);
  return httph.ok_response(res, data || 'success');
}

async function create_value_mapping(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let topic_key = httph.second_match(req.url, regex);
  let {schema} = await httph.buffer_json(req);
  let [_, cluster, region] = cluster_key.match('([^-]+)-(.+)');

  let {name: topic_name} = await common.topic_exists(pg_pool, topic_key, cluster_key);

  let data = await common.alamo.topic_schemas.create_value_mapping(region, cluster, topic_name, schema);
  return httph.ok_response(res, data || 'success');
}

module.exports = {
  list_schemas,
  list_mappings,
  create_key_mapping,
  create_value_mapping
};
