"use strict"

const assert = require('assert');
const common = require('./common.js');
const config = require('./config.js');
const httph = require('./http_helper.js');
const fs = require('fs');
const uuid = require('uuid');
const orgs = require('./organizations.js');
const query = require('./query.js');


function return_type(obj) {
  return obj.common_name.startsWith("*.") ? 
    "wildcard" : 
    ((obj.domain_names.length === 1 || obj.domain_names === obj.common_name) ?  
      "ssl_plus" : 
      "multi_domain"
    )
}

function db_to_response(obj) {
  return {
    created_at:obj.created.toISOString(),
    id:obj.certificate,
    name:obj.name,
    comments:obj.comments,
    requester:{
      name:obj.created_by
    },
    organization:{
      id:obj.org,
      name:obj.org_name
    },
    region:{
      id:obj.region_uuid,
      name:obj.region_name
    },
    request:obj.request,
    common_name:obj.common_name,
    domain_names:obj.domain_names.split(','),
    installed:obj.installed,
    status:obj.status,
    expires:obj.expires ? obj.expires.toISOString() : null,
    issued:obj.issued ? obj.issued.toISOString() : null,
    updated_at:obj.updated.toISOString(),
    type:return_type(obj)
  }
}

function request_to_db(payload) {
  return [
    payload.id, 
    payload.name, 
    payload.region,
    payload.request, 
    payload.comments, 
    payload.requester.name || '', 
    payload.organization.id,
    payload.status,
    payload.updated_at, 
    payload.created_at
  ];
}

let update_query = query.bind(query, fs.readFileSync('./sql/update_certificate.sql').toString('utf8'), (r) => { return r; });
let select_query = query.bind(query, fs.readFileSync('./sql/select_certificate.sql').toString('utf8'), (r) => { return db_to_response(r); });
async function info_endpoints(pg_pool, req, res, regex) {
  let id = httph.first_match(req.url, regex);
  let items = await select_query(pg_pool, [id])
  if(items.length === 0 || items[0].installed !== true) {
    throw new common.NotFoundError(`The certificate ${id} was not found.`)
  }
  return httph.ok_response(res, JSON.stringify(items[0]));
}

async function info_orders(pg_pool, req, res, regex) {
  let id = httph.first_match(req.url, regex);
  let items = await select_query(pg_pool, [id])
  if(items.length === 0) {
    throw new common.NotFoundError(`The certificate ${id} was not found.`)
  }
  let requested_cert = null
  if(!process.env.TEST_MODE) {
    try {
      requested_cert = await common.alamo.certificate.status(items[0].region.name, items[0].request)
    } catch (e) {
      console.error(e)
      if(e.stack) {
        console.error(e.stack)
      }
      throw new common.UnprocessibleEntityError('The certificate status was unavailable. If this continues contact an administrator.')
    }
  } else if (process.env.TEST_MODE_APPROVE_CERT) {
    requested_cert = {"status":"issued", issued:"2016-08-25T18:51:09.371Z", expires:"2016-08-25T18:51:09.371Z"}
  } else {
    requested_cert = {"status":"pending", issued:null, expires:null}
  }
  let dirty = false;
  if(items[0].status !== requested_cert.status) {
    dirty = true;
    items[0].status = requested_cert.status;
    items[0].updated_at = (new Date()).toISOString();
  }
  if(items[0].status === "issued" && (!items[0].issued || !items[0].expires)) {
    dirty = true;
    items[0].issued = (new Date(requested_cert.issued)).toISOString()
    items[0].expires = (new Date(requested_cert.expires)).toISOString()
  }
  if(dirty) {
    await update_query(pg_pool, [items[0].id, items[0].status, items[0].updated_at, items[0].installed, items[0].issued, items[0].expires]);
  }
  return httph.ok_response(res, JSON.stringify(items[0]));
}

let select_all_query = query.bind(query, fs.readFileSync('./sql/select_certificates.sql').toString('utf8'), (r) => { return db_to_response(r); });
async function list(filter_orders, pg_pool, req, res, regex) {
  let items = await select_all_query(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(items.filter((item) => { 
    return (!filter_orders && item.status === 'issued' && item.installed) || 
            (filter_orders && (item.status !== 'issued' || !item.installed));
  })));
}

async function install(pg_pool, req, res, regex) {
  let id = httph.first_match(req.url, regex);
  let items = await select_query(pg_pool, [id])
  if(items.length === 0) {
    throw new common.NotFoundError(`The specified certificate ${id} was not found.`)
  }
  if(items[0].installed) {
    throw new common.ConflictError('The specified certificate is already installed.')
  }
  if(items[0].status !== 'issued') {
    throw new common.UnprocessibleEntityError('The specified certificate has not yet been approved and issued.')
  }
  items[0].installed = true;
  items[0].updated_at = (new Date()).toISOString();
  if(!process.env.TEST_MODE) {
    await common.alamo.certificate.install(items[0].region.name, items[0].request)
  }
  await update_query(pg_pool, [items[0].id, items[0].status, items[0].updated_at, items[0].installed, items[0].issued, items[0].expires])
  return httph.created_response(res, JSON.stringify(items[0]));
}

function check_create(payload) {
  // payload.org is already checked.
  assert.ok(payload.name && /(^[A-z0-9\-\.]+$)/.exec(payload.name) !== null, 'The name of a certificate must be an alpha numeric.');
  assert.ok(payload.common_name && /(^[A-z0-9\.\-\*]+$)/.exec(payload.common_name) !== null, 'The domain name was invalid, it must be an alpha numeric string.');
  assert.ok(payload.common_name.length < 65, 'The common domain provided was too long.')
  assert.ok(payload.domain_names && 
    !payload.domain_names.some((domain) => { return domain.length > 64; }),
    'One or more of the alternative domains was too long.')
  assert.ok(payload.domain_names &&
    !payload.domain_names.some((domain_name) => { return /(^[A-z0-9\.\-\*]+$)/.exec(domain_name) === null; }), 
    'One or more of the specified alternative domain names was invalid, it must be an alpha numeric string.');
  assert.ok(payload.domain_names.includes(payload.common_name), 'The common name must be in the list of domain names.');
  assert.ok(!payload.comments || (payload.comments && payload.comments.length < 2048), 'The specified comments were too long.');
}


let insert_query = query.bind(query, fs.readFileSync('./sql/insert_certificate.sql').toString('utf8'), (r) => { return r; });
let insert_names_query = query.bind(query, fs.readFileSync('./sql/insert_certificate_names.sql').toString('utf8'), (r) => { return r; });
async function create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let org = await common.org_exists(pg_pool, payload.org)
  try {
    check_create(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let items = await select_query(pg_pool, [payload.name])
  if(items.length !== 0) {
    throw new common.UnprocessibleEntityError('The specified certificate name already exists.')
  }
  payload.id = uuid.v4();
  payload.requester = {
    name:req.headers['x-username']
  };
  delete payload.org
  payload.comments = payload.comments || "";
  payload.installed = false;
  payload.status = 'pending';
  payload.expires = null;
  payload.issued = null;
  payload.created_at = payload.updated_at = (new Date()).toISOString();
  payload.organization = {
    id:org.org,
    name:org.name
  };
  
  // validate region
  let region = null
  if(payload.region) {
    region = await common.alamo.region(pg_pool, payload.region)
  } else {
    region = await common.alamo.default_region(pg_pool)
  }
  payload.region = region.region

  if(!process.env.TEST_MODE) {
    let requested_cert = await common.alamo.certificate.create(region.name, payload.comments, payload.common_name, payload.domain_names, payload.requester.name)
    payload.request = requested_cert.id
  } else {
    payload.request = uuid.v4()
  }
  await insert_query(pg_pool, request_to_db(payload))
  await Promise.all(payload.domain_names.map( async (domain_name) => insert_names_query(pg_pool, [uuid.v4(), payload.id, domain_name, domain_name === payload.common_name])));
  payload.region = {
    id:region.region,
    name:region.name
  }
  payload.type = return_type(payload)
  return httph.created_response(res, JSON.stringify(payload));
}


module.exports = {
  orders:{
    get:info_orders,
    list:list.bind(null, true),
    create,
    install,
  },
  get:info_endpoints,
  list:list.bind(null, false),
}