"use strict"

const common = require('./common.js');
const http_help = require('./http_helper.js');

/*
// public
async function get(pg_pool, req, res, regex) {
  let fullCluster = http_help.first_match(req.url, regex);
  let name = http_help.second_match(req.url, regex);
  if (!fullCluster || !name)
    throw new common.UnprocessibleEntityError('Provide cluster and name');

  let [_, cluster, region] = fullCluster.match('([^-]+)-(.+)');
  console.log('c' + cluster)
  console.log('r' + region)
  let data = await common.alamo.topic_configs.get(region, cluster, name);
  return http_help.ok_response(res, JSON.stringify(data));
}

//topic_config             |  name  |                                     description                                     | cleanup_policy | partitions | retention_ms | replicas
const types = [
  ['61234c3c-fe5d-4253-e26b-b222fb1ccbcb', 'state', 'A compacted topic with infinite retention, for keeping state of one type.', 'compact', 3, -1, 3],
  ['72334dac-f444-8325-8218-cd21fb1c382c', 'ledger', 'A non-compacted audit-log style topic for tracking changes in one value type.', 'delete', 3, 2629740000, 3, 2],
  ['d3464caa-ee5d-4a03-8adb-37c2fb1c111b', 'event', 'A non-compacted event-stream style topic which may contain multiple types of values', 'delete', 3, 2629740000, 3, 3]
].map( arr => {

});
*/

async function list(pg_pool, req, res, regex) {
  let fullCluster = http_help.first_match(req.url, regex);
  if (!fullCluster)
    throw new common.UnprocessibleEntityError('Provide cluster');

  let [_, cluster, region] = fullCluster.match('([^-]+)-(.+)');
  let data = await common.alamo.topic_configs.list(region, cluster);
  return http_help.ok_response(res, JSON.stringify(data));
}

module.exports = {
  list
};
