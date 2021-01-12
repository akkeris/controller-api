const url = require('url');
const config = require('./config.js');
////// deprecated //////

const common = require('./common.js');
const httph = require('./http_helper.js');

const curl = config.log_session_url ? (new url.URL(config.log_session_url)) : '';
const log_session_url = curl ? (`${curl.protocol}//${curl.host}`) : '';

/* eslint-disable max-len */
// const log_session_token = curl !== '' ? (curl.username ? (curl.password ? `${curl.username}:${curl.password}` : curl.username) : '') : '';
// const log_session_headers = { 'content-type': 'application/json', authorization: log_session_token };
/* eslint-enable max-len */

async function create_app_logsession(pg_pool, app_name, space_name, lines, tail) {
  if (lines < 1 || !Number.isInteger(lines)) {
    throw new common.UnprocessibleEntityError('The specified lines was either not a number or less than 1.');
  } else if (lines > 250) {
    throw new common.UnprocessibleEntityError('The specified lines field was larger than allowed (250 is the maximum).');
  }
  const data = common.alamo.drains.session(pg_pool, 'app', `${app_name}-${space_name}`, lines, tail);
  data.created_date = (new Date()).toISOString();
  return data;
}

async function create_site_logsession(pg_pool, site_uuid, site_name, lines, tail) {
  if (lines < 1 || !Number.isInteger(lines)) {
    throw new common.UnprocessibleEntityError('The specified lines was either not a number or less than 1.');
  } else if (lines > 250) {
    throw new common.UnprocessibleEntityError('The specified lines field was larger than allowed (250 is the maximum).');
  }
  const data = common.alamo.drains.session(pg_pool, 'site', site_name, lines, tail);
  data.created_date = (new Date()).toISOString();
  return data;
}

async function http_create(pg_pool, req, res, regex) {
  if (req.url.indexOf('/sites/') === -1) {
    const app_key = httph.first_match(req.url, regex);
    const app = await common.app_exists(pg_pool, app_key);
    const payload = await httph.buffer_json(req, res);
    const data = await create_app_logsession(pg_pool, app.app_name, app.space_name, payload.lines, payload.tail);
    return httph.created_response(res, JSON.stringify({
      created_at: data.created_date,
      id: data.id,
      logplex_url: data.logplex_url ? data.logplex_url : (`${log_session_url}/log-sessions/${data.id}`),
      updated_at: data.created_date,
    }));
  }
  const site_key = httph.first_match(req.url, regex);
  const site = await common.site_exists(pg_pool, site_key);
  const payload = await httph.buffer_json(req, res);
  const data = await create_site_logsession(pg_pool, site.site, site.domain, payload.lines, payload.tail);
  return httph.created_response(res, JSON.stringify({
    created_at: data.created_date,
    id: data.id,
    logplex_url: data.logplex_url ? data.logplex_url : (`${log_session_url}/log-sessions/${data.id}`),
    updated_at: data.created_date,
  }));
}

module.exports = {
  http: {
    create: http_create,
  },
  create: create_app_logsession,
};
