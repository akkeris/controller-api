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
const select_topics = query.bind(query, fs.readFileSync('./sql/select_topics.sql').toString('utf8'), n => n);
const insert_topic = query.bind(query, fs.readFileSync('./sql/insert_topic.sql').toString('utf8'), n => n);
const delete_topic = query.bind(query, fs.readFileSync('./sql/delete_topic.sql').toString('utf8'), n => n);
const delete_acl_by_topic = query.bind(query, fs.readFileSync('./sql/delete_acl_by_topic.sql').toString('utf8'), n => n);         
const select_acls_by_topic = query.bind(query, fs.readFileSync('./sql/select_topic_acls_by_topic.sql').toString('utf8'), n => n);
const insert_acl = query.bind(query, fs.readFileSync('./sql/insert_topic_acl.sql').toString('utf8'), n => n);         

async function list(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {cluster} = await common.cluster_exists(pg_pool, cluster_key);
  let data = await select_topics(pg_pool, [cluster])
  return httph.ok_response(res, JSON.stringify(data))
}

async function preview(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {name: cluster_name, cluster: cluster_uuid, region_name} = await common.cluster_exists(pg_pool, cluster_key);
  let topic_key = httph.second_match(req.url, regex);
  let topic = await common.topic_exists(pg_pool, topic_key, cluster_key);

  //Check elevated access to preview topic in prod
  if(cluster_name.toLowerCase().trim() === 'prod') {
    if(!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username'])) {
      console.info(`User '${req.headers['x-username']}' Unauthorized to delete topic '${topic_key}' in cluster '${cluster_name}'`)
      throw new httph.UnauthorizedError(`Preview of topic '${topic_key}' in cluster '${cluster_name}' can only be done with elevated access`)
    } 
  }

  let data = await common.alamo.topics.preview(region_name, cluster_name, topic_key)
  return httph.ok_response(res, JSON.stringify(data))
}

async function get(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {cluster} = await common.cluster_exists(pg_pool, cluster_key);
  let topic_key = httph.second_match(req.url, regex);

  let {db_topic, system_topic} = await get_topic_db_and_backend(pg_pool, topic_key, cluster)

  return httph.ok_response(res, topic_to_response(db_topic, system_topic));
}

async function get_topic_db_and_backend(pg_pool, topic_name, cluster_uuid) {
  let db_topics = await select_topic(pg_pool, [topic_name, cluster_uuid]);
  if (db_topics.length === 0) {
    throw new common.NotFoundError('The specified topic does not exist.');
  }

  let db_topic = db_topics[0];

  // Get info from alamo
  let {topic: system_topic} = await common.alamo.topics.get(db_topic.region_name, db_topic.name);
  return {db_topic, system_topic}
}

async function create(pg_pool, req, res, regex) {
  let {cluster_id, cluster_name, region_id, region_name, topic_name: name, config_name, partitions_override, retention_ms_override, description, org} = 
    await validateCreateReq(pg_pool, req, res, regex)

  // See if it's in the database already
  if ((await select_topic(pg_pool, [name, cluster_name])).length !== 0) {
    throw new common.ConflictError("The specified topic already exists.");
  }

  let result = await common.alamo.topics.create(region_name, cluster_name, name, config_name, partitions_override, retention_ms_override);
  let [inserted] = await insert_topic(pg_pool, [uuid.v4(), result.topic.name, result.topic.config.name, result.topic.config.partitions, result.topic.config.replicas, result.topic.config['retention.ms'], result.topic.config['cleanup.policy'], cluster_id, region_id, org, description]);
  return httph.ok_response(res, { name: inserted.name });
}

async function validateCreateReq(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req);
  let cluster_key = httph.first_match(req.url, regex);  

  let {cluster: cluster_id, topic_name_regex, name: cluster_name, region_name} = await common.cluster_exists(pg_pool, cluster_key);
  for (let key of ['name', 'config', 'organization']){
    if (!payload[key] || !/(^[A-z0-9._-]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field: ${payload[key]}.`);
    }
  }
  let {region: region_id} = await common.alamo.region(pg_pool, region_name);
  let {name, organization, config: config_name, partitions: partitions_override, retentionms: retention_ms_override} = payload;
  let description = payload.description || '';
  let {name: org} = await common.org_exists(pg_pool, organization)
  if (!new RegExp(topic_name_regex).test(name)){
    throw new common.UnprocessibleEntityError(`A topic name in cluster ${cluster_name} must match regex /${topic_name_regex}/`);
  }
  let response = {cluster_id, cluster_name, region_id, region_name, topic_name: name, config_name, partitions_override, retention_ms_override, description, org}
  return response
}

async function recreate(pg_pool, req, res, regex) {
  let {cluster_id, cluster_name, region_id, region_name, topic_name: name, config_name, partitions_override, retention_ms_override, description, org} = 
    await validateCreateReq(pg_pool, req, res, regex)

  //check access
  if(cluster_name.toLowerCase().trim() === 'prod') {
    if(!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username'])) {
      console.info(`User '${req.headers['x-username']}' Unauthorized to recreate topic '${name}' in cluster '${cluster_name}'`)
      throw new httph.UnauthorizedError(`Recreation of topic '${name}' in cluster '${cluster_name}' can only be done with elevated access`)
    } 
  }

  //topic in db and backend before
  let {db_topic: db_topic_before, system_topic: system_topic_before} = await get_topic_db_and_backend(pg_pool, name, cluster_id)

  let acls = await select_acls_by_topic(pg_pool, [db_topic_before.topic]);

  //delete the topic and subscriptions
  console.info(`Topic '${name}' in cluster '${cluster_name}' recreate request by User '${req.headers['x-username']}'`)
  await delete_topic(pg_pool, [db_topic_before.topic]);
  await common.alamo.topics.delete(region_name, cluster_name, name)
  await delete_acl_by_topic(pg_pool, [db_topic_before.topic]);
  
  
  await new Promise((r) => setTimeout(r, 5000));
  
  //recreate the topic
  let result = await common.alamo.topics.create(region_name, cluster_name, name, config_name, partitions_override, retention_ms_override);
  let new_topic_uuid = uuid.v4()
  let [inserted] = await insert_topic(pg_pool, [new_topic_uuid, result.topic.name, result.topic.config.name, result.topic.config.partitions, result.topic.config.replicas, result.topic.config['retention.ms'], result.topic.config['cleanup.policy'], cluster_id, region_id, org, description]);

  //recreate acls
  for(let acl of acls) {
    let {id, consumerGroupName} = await common.alamo.topic_acls.create(region_name, cluster_name, name, acl.app_name, acl.space_name, acl.role, acl.consumer_group_name);
    let newacldb = await insert_acl(pg_pool, [id, new_topic_uuid, acl.app, acl.role, consumerGroupName]);
  }

  // recreate key mappings
  if(system_topic_before.keyMapping) {
    let key = await common.alamo.topic_schemas.create_key_mapping(region_name, cluster_name, name, system_topic_before.keyMapping.keyType, system_topic_before.keyMapping.schema);
  }

  //recreate value mapppings
  if(system_topic_before.schemas) {
    let schemas = system_topic_before.schemas
    for(let schema of schemas) {
      let value = await common.alamo.topic_schemas.create_value_mapping(region_name, cluster_name, name, schema);
    }
  }

  let {db_topic, system_topic} = await get_topic_db_and_backend(pg_pool, name, cluster_id)
  var response = topic_to_response(db_topic, system_topic)
  response.subscriptions = await select_acls_by_topic(pg_pool, [db_topic.topic]);
  return httph.ok_response(res, response);
}

async function remove(pg_pool, req, res, regex){
  let cluster_key = httph.first_match(req.url, regex);
  let topic_key = httph.second_match(req.url, regex);
  let [_, cluster_name, region_name] = cluster_key.match(/([^-]+)-(.+)/);
  let topic = await common.topic_exists(pg_pool, topic_key, cluster_key);
  
  //Check elevated access to delete in prod cluster.
  if(cluster_name.toLowerCase().trim() === 'prod') {
    if(!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username'])) {
      console.info(`User '${req.headers['x-username']}' Unauthorized to delete topic '${topic_key}' in cluster '${cluster_name}'`)
      throw new httph.UnauthorizedError(`Deletion of topic '${topic_key}' in cluster '${cluster_name}' can only be done with elevated access`)
    } 
  }
  console.info(`Topic '${topic_key}' in cluster '${cluster_name}' deletion request by User '${req.headers['x-username']}'`)
  await delete_topic(pg_pool, [topic.topic]);
  await common.alamo.topics.delete(region_name, cluster_name, topic_key)
  
  await delete_acl_by_topic(pg_pool, [topic.topic]);
  return httph.ok_response(res, {});
}

module.exports = {
  get: get, 
  create: create, 
  list: list,
  delete: remove,
  preview: preview,
  recreate: recreate,
};
