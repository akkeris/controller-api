"use strict"

const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

// private
function acl_to_response(acl) {
  return {
    id: acl.topic_acl,
    topic: acl.topic,
    app: acl.app,
    role: acl.role,
    created: acl.created,
    updated: acl.updated
  };
}

// In:  [topic_acl_id] 
// Out: [topic_acl, topic, app, app_name, topic, topic_name, cluster, role, created, updated]
const select_acl = query.bind(query, fs.readFileSync('./sql/select_topic_acl.sql').toString('utf8'), n => n);

// In:  [app_id] 
// Out: [topic_acl, topic, app, app_name, topic, topic_name, cluster, role, created, updated]
const select_acls = query.bind(query, fs.readFileSync('./sql/select_topic_acls.sql').toString('utf8'), n => n);       

// In:  [topic, app, role]
// Out: [topic, app, role]
const insert_acl = query.bind(query, fs.readFileSync('./sql/insert_topic_acl.sql').toString('utf8'), n => n);         

// In:  [acl_id]
// Out: [acl_id]
const delete_acl = query.bind(query, fs.readFileSync('./sql/delete_topic_acl.sql').toString('utf8'), n => n);         

// public
async function list_by_topic(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {cluster: cluster_uuid} = await common.cluster_exists(pg_pool, cluster_key);
  
  let topic_key = httph.second_match(req.url, regex);
  let {topic} = await common.topic_exists(pg_pool, topic_key, cluster_uuid);

  let data = await select_acls(pg_pool, [topic]);
  return httph.ok_response(res, JSON.stringify(data));
}

//public 
async function create(pg_pool, req, res, regex){
  let payload = await httph.buffer_json(req);
  
  let cluster_key = httph.first_match(req.url, regex);
  let {name: cluster_name, cluster: cluster_uuid, region_name} = await common.cluster_exists(pg_pool, cluster_key);
  
  let topic_key = httph.second_match(req.url, regex);
  let {topic: topic_uuid, name: topic_name} = await common.topic_exists(pg_pool, topic_key, cluster_uuid);

  if (!payload.app){
    throw new common.UnprocessibleEntityError(`The specified request contained an invalid "app" field.`);
  }

  let {app_uuid, app_name, space_name} = await common.app_exists(pg_pool, payload.app);
  
  let role = payload.role;
  if (!role){
    throw new common.UnprocessibleEntityError(`The specified request contained an invalid "app" field.`);
  }

  // Create in DB
  let result = await insert_acl(pg_pool, [uuid.v4(), topic_uuid, app_uuid, role]);

  // In test mode, don't actually create the ACL.
  if (!process.env.TEST_MODE) {
    await common.alamo.topic_acls.create(region_name, cluster_name, topic_name, app_name, space_name, role);
  }

  return httph.ok_response(res, JSON.stringify(acl_to_response(result[0])));
}

async function remove(pg_pool, req, res){
  let acl_id = httph.first_match(req.url, /\/acls\/([A-z0-9._-]+)/);
  let {region} = await select_acl(pg_pool, [acl_id]);
  await delete_acl(pg_pool, [acl_id]);

  // In test mode, don't actually delete the ACL.
  if (!process.env.TEST_MODE) {
    await common.alamo.topic_acls.delete(region, acl_id);
  }

  return httph.no_content_response(res);
}

module.exports = {
  list: list_by_topic, 
  create: create, 
  delete: remove
};
