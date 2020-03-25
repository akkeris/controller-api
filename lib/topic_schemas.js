const common = require('./common.js');
const httph = require('./http_helper.js');

async function list_schemas(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  if (!cluster_key || !/[^-]+-(.+)/.test(cluster_key)) {
    throw new common.UnprocessibleEntityError('Provide cluster name in "cluster-region" format.');
  }

  const [, cluster, region] = cluster_key.match('([^-]+)-(.+)');
  await common.cluster_exists(pg_pool, cluster_key);
  const data = await common.alamo.topic_schemas.get(region, cluster);
  return httph.ok_response(res, data.schemas.sort((a, b) => {
    if (a < b) {
      return -1;
    } if (b < a) {
      return 1;
    }
    return 0;
  }));
}

async function list_mappings(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const topic_key = httph.second_match(req.url, regex);
  const [, cluster, region] = cluster_key.match('([^-]+)-(.+)');

  const { name: topic_name } = await common.topic_exists(pg_pool, topic_key, cluster_key);

  const data = await common.alamo.topic_schemas.get_mappings(region, cluster, topic_name);
  return httph.ok_response(res, data.schemas);
}

async function create_key_mapping(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const topic_key = httph.second_match(req.url, regex);
  const { keytype, schema } = await httph.buffer_json(req);
  const [, cluster, region] = cluster_key.match('([^-]+)-(.+)');

  const { name: topic_name } = await common.topic_exists(pg_pool, topic_key, cluster_key);

  const data = await common.alamo.topic_schemas.create_key_mapping(region, cluster, topic_name, keytype, schema);
  return httph.ok_response(res, data || 'success');
}

async function create_value_mapping(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const topic_key = httph.second_match(req.url, regex);
  const { schema } = await httph.buffer_json(req);
  const [, cluster, region] = cluster_key.match('([^-]+)-(.+)');

  const { name: topic_name } = await common.topic_exists(pg_pool, topic_key, cluster_key);

  const data = await common.alamo.topic_schemas.create_value_mapping(region, cluster, topic_name, schema);
  return httph.ok_response(res, data || 'success');
}

module.exports = {
  list_schemas,
  list_mappings,
  create_key_mapping,
  create_value_mapping,
};
