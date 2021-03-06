const fs = require('fs');
const common = require('./common.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');

const select_cluster = query.bind(query, fs.readFileSync('./sql/select_cluster.sql').toString('utf8'), null);
const select_clusters = query.bind(query, fs.readFileSync('./sql/select_clusters.sql').toString('utf8'), null);

// public
async function get(pg_pool, req, res, regex) {
  const name = http_help.first_match(req.url, regex);
  if (!name) {
    throw new common.UnprocessibleEntityError('Provide cluster name');
  }

  const data = await select_cluster(pg_pool, [name]);
  if (data.length === 0) {
    throw new common.NotFoundError('The specified cluster does not exist.');
  }

  return http_help.ok_response(res, data[0]);
}

async function list(pg_pool, req, res) {
  const data = await select_clusters(pg_pool, []);
  return http_help.ok_response(res, data);
}

module.exports = {
  get,
  list,
};
