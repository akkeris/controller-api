"use strict"

const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');


// private
function topic_to_response(db_topic, system_topic) {
  return {
    id: db_topic.topic,
    name: db_topic.name,
    cluster: db_topic.cluster_name,
    region: db_topic.region_name,
    config: system_topic.config.name,
    description: db_topic.description,
    partitions: system_topic.config.partitions,
    replicas: system_topic.config.replicas,
    retention_ms: system_topic.config['retention.ms'],
    cleanup_policy: system_topic.config['cleanup.policy'],
    organization: db_topic.organization,
    key_mapping: system_topic.keyMapping ? (system_topic.keyMapping.schema ? system_topic.keyMapping.schema : system_topic.keyMapping.keyType) : 'not configured',
    schemas: system_topic.schemas ? system_topic.schemas.join(', ') : 'not configured',
    created: db_topic.created,
    updated: db_topic.updated
  };
}

const select_topic = query.bind(query, fs.readFileSync('./sql/select_topic.sql').toString('utf8'), n => n);
const select_topics = query.bind(query, fs.readFileSync('./sql/select_topics.sql').toString('utf8'), topic_to_response);
const insert_topic = query.bind(query, fs.readFileSync('./sql/insert_topic.sql').toString('utf8'), n => n);
const delete_topic = query.bind(query, fs.readFileSync('./sql/delete_topic.sql').toString('utf8'), n => n);

async function list(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {cluster} = await common.cluster_exists(pg_pool, cluster_key);
  let data = await select_topics(pg_pool, [cluster])
  return httph.ok_response(res, JSON.stringify(data))
}

async function get(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {cluster} = await common.cluster_exists(pg_pool, cluster_key);
  let topic_key = httph.second_match(req.url, regex);

  let db_topics = await select_topic(pg_pool, [topic_key, cluster]);
  if (db_topics.length === 0) {
    throw new common.NotFoundError('The specified topic does not exist.');
  }

  let db_topic = db_topics[0];

  // Get info from alamo
  let {topic: system_topic} = await common.alamo.topics.get(db_topic.region_name, db_topic.name);

  return httph.ok_response(res, topic_to_response(db_topic, system_topic));
}

async function create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req);
  let cluster_key = httph.first_match(req.url, regex);
  let [_, cluster_name, region_name] = cluster_key.match(/([^-]+)-(.+)/);

  for (let key of ['name', 'config', 'organization']){
    if (!payload[key] || !/(^[A-z0-9._-]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field: ${payload[key]}.`);
    }
  }

  let {name, organization, config: config_name} = payload;
  let {region: region_id} = await common.alamo.region(pg_pool, region_name);
  let description = payload.description || '';
  let {partitions, retention_ms, replicas, cleanup_policy} = await common.alamo.topic_configs.get(region_name, cluster_name, config_name);

  // See if it's in the database already
  if ((await select_topic(pg_pool, [name, region_name])).length !== 0) {
    throw new common.ConflictError("The specified topic already exists.");
  }

  let config = (await common.alamo.topic_configs.list(region_name, cluster_name)).configs.filter(conf => conf.name == payload.config);
  if (!config) {
    throw new common.UnprocessibleEntityError("Unknown topic config type " + payload.config);
  }

  let {cluster: cluster_id, topic_name_regex} = await common.cluster_exists(pg_pool, cluster_key);

  if (!new RegExp(topic_name_regex).test(name)){
    throw new common.UnprocessibleEntityError(`A topic name in cluster ${cluster_name} must match regex /${topic_name_regex}/`);
  }

  let inserted = await insert_topic(pg_pool, [uuid.v4(), name, config_name, partitions, replicas, retention_ms, cleanup_policy, cluster_id, region_id, organization, description]);
  if (inserted.length != 1){
    throw new common.UnprocessibleEntityError(`Could not insert new topic.`);
  }

  await common.alamo.topics.create(region_name, cluster_name, name, config_name);

  return httph.ok_response(res, { name: inserted.name });
}

async function remove(pg_pool, req, res, regex){
  let cluster_key = httph.first_match(req.url, regex);
  let topic_key = httph.second_match(req.url, regex);

  let topic = await common.topic_exists(pg_pool, topic_key, cluster_key);

  await delete_topic(pg_pool, [topic.topic]);

  // In test mode, don't actually delete the ACL.
  if (!process.env.TEST_MODE) {
    await common.alamo.topic_acls.delete(region, topic.name);
  }

  return httph.no_content_response(res);
}

module.exports = {
  get: get, 
  create: create, 
  list: list,
  delete: remove
};
