"use strict"

const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const config = require('./config.js');
const common = require('./common.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');

// private
function topic_to_postgres(payload) {
  return [payload.id,
          payload.name, 
          payload.topic_config,
          payload.partitions, 
          payload.replicas, 
          payload.retention_ms, 
          payload.cleanup_policy, 
          payload.cluster, 
          payload.region,
          payload.organization, 
          payload.description];
}

// private
function topic_to_response(payload) {
  return payload;
}

// private
const select_topic = query.bind(query, fs.readFileSync('./sql/select_topic.sql').toString('utf8'), n => n);
const insert_topic = query.bind(query, fs.readFileSync('./sql/insert_topic.sql').toString('utf8'), n => n);
const select_topics = query.bind(query, fs.readFileSync('./sql/select_topics.sql').toString('utf8'), topic_to_response);
//const update_topic = query.bind(query, fs.readFileSync('./sql/update_topic.sql').toString('utf8'), topic_to_response);


// public
async function list(pg_pool, req, res) {
  let data = await select_topics(pg_pool, [])
  return http_help.ok_response(res, JSON.stringify(data))
}

// public
async function get(pg_pool, req, res) {
  let key = http_help.first_match(req.url, /([0-9A-Za-z_.-]+)$/);
  let data = await select_topic(pg_pool, [key]);
  if (data.length === 0) {
    throw new common.NotFoundError('The specified topic does not exist.');
  }

  return http_help.ok_response(res, JSON.stringify(topic_to_response(data[0])));
}

// public
async function create(pg_pool, req, res) {
  let payload = await http_help.buffer_json(req);
  let config = payload.topic_config ? await common.topic_config_exists(pg_pool, payload.topic_config) : undefined;
  
  if (config){
    payload.topic_config = config.topic_config;
    payload.retention_ms = config.retention_ms;
    payload.partitions = config.partitions;
    payload.cleanup_policy = config.cleanup_policy;
    payload.replicas = config.replicas;
  }
  
  for (let key of ['region', 'name', 'cleanup_policy', 'cluster', 'organization', 'topic_config']){
    if (!payload[key] || !/(^[A-z0-9._-]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field: ${payload[key]}.`);
    }
  }

  for (let key of ['partitions', 'replicas', 'retention_ms']){
    if (!payload[key] || !/(^-?[0-9]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field: ${payload[key]}.`);
    }
  }

  let {org} = await common.org_exists(pg_pool, payload.organization);
  payload.organization = org;

  // See if it's in the database already
  let data = await select_topic(pg_pool, [payload.name])
  if (data.length !== 0) {
    throw new common.ConflictError("The specified topic already exists.")
  }

  payload.description = payload.description || '';
  payload.topic = uuid.v4();
  payload.updated = payload.created = new Date();
  payload.id = uuid.v4();
  
  await insert_topic(pg_pool, topic_to_postgres(payload));

  // In test mode, don't actually create a topic in Kafka.
  if (!process.env.TEST_MODE) {
    await common.alamo.topics.create(payload.region, payload.cluster, payload.name, payload.description, payload.cleanup_policy, payload.partitions, payload.retention_ms, payload.replicas);
  }

  return http_help.ok_response(res, JSON.stringify(topic_to_response(payload)));
}

module.exports = {
  get: get, 
  create: create, 
  list: list
};
