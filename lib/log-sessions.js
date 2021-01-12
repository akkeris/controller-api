const url = require('url');
const uuid = require('uuid');
const config = require('./config.js');
const common = require('./common.js');
const httph = require('./http_helper.js');

async function create_logtail(pg_pool, app_name, space_name, lines, tail) {
  if (lines < 1 || !Number.isInteger(lines)) {
    throw new common.UnprocessibleEntityError('The specified lines was either not a number or less than 1.');
  } else if (lines > 250) {
    throw new common.UnprocessibleEntityError('The specified lines field was larger than allowed (250 is the maximum).');
  }
  const {url: logplex_url} = common.alamo.tails.create(pg_pool, `${app_name}-${space_name}`, lines, tail);
  let data = {}
  data.updated_at = data.created_at = (new Date()).toISOString();
  data.id = uuid.v4();
  data.logplex_url = logplex_url;
  return data;
}

async function http_create(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const payload = await httph.buffer_json(req, res);
  return httph.created_response(res, JSON.stringify(await create_logtail(pg_pool, app.app_name, app.space_name, payload.lines, payload.tail)));
}

module.exports = {
  http: {
    create: http_create,
  },
  create: create_logtail,
};
