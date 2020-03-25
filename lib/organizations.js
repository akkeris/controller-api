const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const http_help = require('./http_helper.js');
const query = require('./query.js');
const common = require('./common.js');

// private
const select_org_query = fs.readFileSync('./sql/select_org.sql').toString('utf8');
const select_org = query.bind(query, select_org_query, (n) => n);

const select_orgs_query = fs.readFileSync('./sql/select_orgs.sql').toString('utf8');
const select_orgs = query.bind(query, select_orgs_query, (n) => n);

function orgs_postgres_to_response(org) {
  return {
    id: org.org,
    created_at: org.created.toISOString(),
    default: false,
    name: org.name,
    role: 'admin',
    updated_at: org.updated.toISOString(),
  };
}

async function list(pg_pool, req, res /* regex */) {
  const org = await select_orgs(pg_pool, []);
  return http_help.ok_response(res, JSON.stringify(org.map(orgs_postgres_to_response)));
}

async function get(pg_pool, req, res, regex) {
  const org = http_help.first_match(req.url, regex);
  const org_obj = await select_org(pg_pool, [org]);
  if (org_obj.length === 0) {
    throw new common.NotFoundError(`The specified organization ${org} does not exist.`);
  }
  return http_help.ok_response(res, JSON.stringify(orgs_postgres_to_response(org_obj[0])));
}

const insert_org = query.bind(query, fs.readFileSync('./sql/insert_org.sql').toString('utf8'), () => {});
async function create(pg_pool, req, res /* regex */) {
  const payload = await http_help.buffer_json(req);
  try {
    assert.ok(payload.name, 'Organization requires the field name.');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  const org = await select_org(pg_pool, [payload.name]);
  if (org.length !== 0) {
    throw new common.ConflictError('The specified organization already exists.');
  }
  payload.id = uuid.v4();
  payload.role = 'admin';
  payload.default = false;
  payload.updated_at = payload.created_at = (new Date()).toISOString();
  await insert_org(pg_pool, [payload.id, (new Date()), (new Date()), payload.name, payload.description]);
  return http_help.created_response(res, JSON.stringify(payload));
}


const delete_org = query.bind(query, fs.readFileSync('./sql/delete_org.sql').toString('utf8'), () => {});
async function remove(pg_pool, req, res, regex) {
  const org_obj = await select_org(pg_pool, [http_help.first_match(req.url, regex)]);
  if (req.headers['x-elevated-access'] !== 'true') {
    throw new common.NotAllowedError('The specified operation is only allowed by administrators.');
  }
  if (org_obj.length === 0) {
    throw new common.NotFoundError('The specified organization does not exist.');
  }
  await delete_org(pg_pool, [org_obj.org]);
  return http_help.ok_response(res, JSON.stringify(org_obj[0]));
}


module.exports = {
  get,
  create,
  list,
  delete: remove,
};
