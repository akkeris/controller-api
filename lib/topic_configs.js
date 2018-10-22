"use strict"

const common = require('./common.js');
const http_help = require('./http_helper.js');

async function list(pg_pool, req, res, regex) {
  let fullCluster = http_help.first_match(req.url, regex);
  if (!fullCluster || !/[^-]+-(.+)/.test(fullCluster))
    throw new common.UnprocessibleEntityError('Provide cluster name in "cluster-region" format.');

  let [_, cluster, region] = fullCluster.match('([^-]+)-(.+)');
  let {configs} = await common.alamo.topic_configs.list(region, cluster);
  return http_help.ok_response(res, JSON.stringify(
    configs.map(config => {
      return {
        name: config.name,
        description: config.description,
        partitions: config.partitions,
        replicas: config.replicas,
        cleanup_policy: config['cleanup.policy'],
        retention_ms: config['retention.ms']
      };
    })
  ));
}

module.exports = { list };
