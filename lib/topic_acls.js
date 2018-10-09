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
    app_name: acl.app_name,
    space_name: acl.space_name,
    role: acl.role,
    created: acl.created,
    updated: acl.updated
  };
}

const select_acl = query.bind(query, fs.readFileSync('./sql/select_topic_acl.sql').toString('utf8'), n => n);
const select_acls_by_topic = query.bind(query, fs.readFileSync('./sql/select_topic_acls_by_topic.sql').toString('utf8'), n => n);       
const select_acl_by_app_and_topic_and_role = query.bind(query, fs.readFileSync('./sql/select_topic_acl_by_app_and_topic_and_role.sql').toString('utf8'), n => n);       

// In:  [app_id] 
// Out: [topic_acl, topic, app, app_name, topic, topic_name, cluster, role, created, updated]
const select_acls_by_app = query.bind(query, fs.readFileSync('./sql/select_topic_acls_by_app.sql').toString('utf8'), n => n);       

// In:  [topic, app, role]
// Out: [topic, app, role]
const insert_acl = query.bind(query, fs.readFileSync('./sql/insert_topic_acl.sql').toString('utf8'), n => n);         

// In:  [acl_id]
// Out: [acl_id]
const delete_acl = query.bind(query, fs.readFileSync('./sql/delete_topic_acl.sql').toString('utf8'), n => n);         

async function list_by_topic(pg_pool, req, res, regex) {
  let cluster_key = httph.first_match(req.url, regex);
  let {cluster: cluster_uuid} = await common.cluster_exists(pg_pool, cluster_key);
  
  let topic_key = httph.second_match(req.url, regex);
  let {topic: topic_uuid} = await common.topic_exists(pg_pool, topic_key, cluster_uuid);

  let data = await select_acls_by_topic(pg_pool, [topic_uuid]);
  return httph.ok_response(res, data.map(acl_to_response));
}

async function list_by_app(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  
  let {app_uuid} = await common.app_exists(pg_pool, app_key);

  let data = await select_acls_by_app(pg_pool, [app_uuid]);
  return httph.ok_response(res, JSON.stringify(data));
}

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

  // Create in system
  let {id} = await common.alamo.topic_acls.create(region_name, cluster_name, topic_name, app_name, space_name, role);

  // Create in DB
  let result = await insert_acl(pg_pool, [id, topic_uuid, app_uuid, role]);

  return httph.ok_response(res, JSON.stringify(acl_to_response(result[0])));
}

async function remove(pg_pool, req, res, regex){
  let cluster_key = httph.first_match(req.url, regex);
  let {region_name} = await common.cluster_exists(pg_pool, cluster_key);
  let topic_key = httph.second_match(req.url, regex);
  let acl_key = httph.third_match(req.url, regex);
  let {topic: topic_uuid} = await common.topic_exists(pg_pool, topic_key, cluster_key);
  let role = httph.fourth_match(req.url, regex);
  let acl_id;
  
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(acl_key)){
    acl_id = acl_key;
  }
  else {
    // ACL key could be an app name.
    let {app_uuid} = await common.app_exists(pg_pool, acl_key);

    let acls = await select_acl_by_app_and_topic_and_role(pg_pool, [app_uuid, topic_uuid, role]);
    if (!acls || acls.length == 0){
      throw new httph.NotFoundError(`No ACL found for topic ${topic_key} and app ${acl_key} in role ${role}.`);
    }

    acl_id = acls[0].topic_acl;
  }
  
  await common.alamo.topic_acls.delete(region_name, acl_id);
  
  await delete_acl(pg_pool, [acl_id]);

  return httph.ok_response(res, JSON.stringify({result: 'success'}));
}

module.exports = {
  list_by_topic,
  list_by_app,
  create,
  delete: remove
};
