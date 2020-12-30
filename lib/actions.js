const httph = require('./http_helper.js');

function http_get(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const action_key = httph.second_match(req.url, regex);
}

function http_create(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
}

function http_list(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
}

function http_delete(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const action_key = httph.second_match(req.url, regex);
}

function http_run(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const action_key = httph.second_match(req.url, regex);
}

module.exports = {
  http: {
    get: http_get,
    create: http_create,
    list: http_list,
    delete: http_delete,
  },
};
