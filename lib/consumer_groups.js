const common = require('./common.js');
const httph = require('./http_helper.js');

async function list_consumer_groups(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const { /* cluster: cluster_uuid, */ name: cluster_name, region_name } = await common.cluster_exists(pg_pool, cluster_key);

  const data = await common.alamo.consumer_groups.list(region_name, cluster_name);
  return httph.ok_response(res, data);
}

async function list_consumer_group_offsets(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const { /* cluster: cluster_uuid, */ name: cluster_name, region_name } = await common.cluster_exists(pg_pool, cluster_key);

  const consumer_group_name = httph.second_match(req.url, regex);

  const data = await common.alamo.consumer_groups.offsets(region_name, cluster_name, consumer_group_name);
  return httph.ok_response(res, data);
}

async function list_consumer_group_members(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const { /* cluster: cluster_uuid, */ name: cluster_name, region_name } = await common.cluster_exists(pg_pool, cluster_key);

  const consumer_group_name = httph.second_match(req.url, regex);
  const data = await common.alamo.consumer_groups.members(region_name, cluster_name, consumer_group_name);
  return httph.ok_response(res, data);
}

async function seek(pg_pool, req, res, regex) {
  const payload = await httph.buffer_json(req);
  const cluster_key = httph.first_match(req.url, regex);
  const { /* cluster: cluster_uuid, */ name: cluster_name, region_name } = await common.cluster_exists(pg_pool, cluster_key);
  const { topic } = payload;

  // Check elevated access to delete in prod cluster or non qa,dev,test topic.
  if (cluster_name === 'prod' || !/^(test-|qa-|dev-)/.test(topic)) {
    if (!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username'])) {
      console.error(`User '${req.headers['x-username']}' Unauthorized to seek consumer group for topic '${topic}' in cluster '${cluster_name}'`);
      throw new httph.UnauthorizedError(`Elevated access required to seek consumer group for topic '${topic}' in cluster '${cluster_name}`);
    }
  }

  const consumer_group_name = httph.second_match(req.url, regex);
  const data = await common.alamo.consumer_groups.seek(region_name, cluster_name, consumer_group_name, payload);
  return httph.ok_response(res, data);
}

module.exports = {
  list: list_consumer_groups,
  offsets: list_consumer_group_offsets,
  members: list_consumer_group_members,
  seek,
};
