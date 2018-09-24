"use strict"

const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

// private
function acl_to_response(payload) {
  return payload;
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
async function list_by_topic(pg_pool, req, res) {
  let topic_key = httph.first_match(req.url, /topics\/([A-z0-9._-]+)\//);
  let {topic} = await common.topic_exists(pg_pool, topic_key);
  let data = await select_acls(pg_pool, [topic]);
  return httph.ok_response(res, JSON.stringify(data));
}

//public 
async function create(pg_pool, req, res){
  let payload = await httph.buffer_json(req);
  
  for (let key of ['topic', 'app', 'role', 'cluster', 'region']){
    if (!payload[key] || !/(^[A-z0-9._-]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field.`);
    }
  }

  let {topic, region} = await common.topic_exists(pg_pool, payload.topic);
  let {app_uuid} = await common.app_exists(pg_pool, payload.app);
  payload.region = region;
  payload.id = uuid.v4();

  // Create in DB
  await insert_acl(pg_pool, [payload.id, topic, app_uuid, payload.role]);

  // In test mode, don't actually create the ACL.
  if (!process.env.TEST_MODE) {
    await common.alamo.topic_acls.create(payload.region, payload.cluster, payload.topic, payload.app, payload.role);
  }

  return httph.ok_response(res, JSON.stringify(acl_to_response(payload)));
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
