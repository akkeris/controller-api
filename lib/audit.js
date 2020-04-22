const url = require('url');
const common = require('./common.js');
const httph = require('./http_helper.js');

async function get(req, res /* regex */) {
  const uri = new url.URL(req.url, `http://${req.headers.host}`);
  const audits = await common.query_audits(uri);
  return httph.ok_response(res, JSON.stringify(audits.hits.hits.map((x) => x._source)));
}

module.exports = {
  get,
};
