"use strict"

const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');

// private
function config_to_response(payload) {
  return payload;
}

// In:  [topic_config_id] 
// Out: [topic_config_id, name, description, cleanup_policy, partitions, retention_ms, replicas]
const select_config = query.bind(query, fs.readFileSync('./sql/select_topic_config.sql').toString('utf8'), n => n);

// In:  [topic_config_id] 
// Out: [topic_config_id, name, description, cleanup_policy, partitions, retention_ms, replicas]
const select_configs = query.bind(query, fs.readFileSync('./sql/select_topic_configs.sql').toString('utf8'), n => n);       

// In:  [topic_config_id, name, description, cleanup_policy, partitions, retention_ms, replicas]
// Out: [topic_config_id]
const insert_config = query.bind(query, fs.readFileSync('./sql/insert_topic_config.sql').toString('utf8'), n => n);         

// In:  [topic_config_id]
// Out: [topic_config_id]
const delete_config = query.bind(query, fs.readFileSync('./sql/delete_topic_config.sql').toString('utf8'), n => n);         

// public
async function get(pg_pool, req, res) {
  let config = httph.first_match(req.url, /topic_configs\/([A-z0-9._-]+)\//);
  let data = await select_config(pg_pool, [config]);
  return http_help.ok_response(res, JSON.stringify(data));
}

// public
async function list(pg_pool, req, res) {
  let data = await select_configs(pg_pool, []);
  return http_help.ok_response(res, JSON.stringify(data));
}

//public 
async function create(pg_pool, req, res){
  let payload = await http_help.buffer_json(req);
  
  for (let key of ['name', 'cleanup_policy', 'partitions', 'retention_ms', 'replicas']){
    if (!payload[key] || !/(^[A-z0-9._-]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field.`);
    }
  }

  let id = uuid.v4();

  // Create in DB
  payload.id = uuid.v4(); 
  await insert_config(pg_pool, [id, payload.name, payload.description, payload.cleanup_policy, payload.partitions, payload.retention_ms, payload.replicas]);

  return http_help.ok_response(res, JSON.stringify(config_to_response(payload)));
}

async function update(pg_pool, req, res){
  let payload = await http_help.buffer_json(req);
  
  for (let key of ['id', 'name', 'cleanup_policy', 'partitions', 'retention_ms', 'replicas']){
    if (!payload[key] || !/(^[A-z0-9._-]+$)/.exec(payload[key])) {
      throw new common.UnprocessibleEntityError(`The specified request contained an invalid "${key}" field.`);
    }
  }

  let id = uuid.v4();

  // Create in DB
  payload.id = uuid.v4(); 
  await insert_config(pg_pool, [id, payload.name, payload.description, payload.cleanup_policy, payload.partitions, payload.retention_ms, payload.replicas]);

  return http_help.ok_response(res, JSON.stringify(config_to_response(payload)));
}

async function remove(pg_pool, req, res){
  let config_id = httph.first_match(req.url, /\/configs\/([A-z0-9._-]+)/);
  let {region} = await select_config(pg_pool, [config_id]);
  await delete_config(pg_pool, [config_id]);
  await common.alamo.topic_configs.delete(region, config_id);
  return http_help.no_content_response(res);
}

module.exports = {
  list,
  get,
  create,
  update,
  remove
};
