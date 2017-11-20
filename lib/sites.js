"use strict"

const fs = require('fs')
const uuid = require('uuid')
const httph = require('./http_helper.js')
const query = require('./query.js')
const config = require('./config.js')
const common = require('./common.js')

function to_response(site) {
  return {
    id:site.site,
    domain:site.domain,
    region:{
      "id":site.region,
      "name":site.region_name,
    },
    created_at:site.created.toISOString(),
    updated_at:site.updated.toISOString(),
    compliance:site.tags.split(',').map((x) => { return x.replace('compliance=', ''); }).filter((x) => { return x !== ''; })
  }
}

let select_sites = query.bind(query, fs.readFileSync('./sql/select_sites.sql').toString('utf8'), to_response);
let select_site = query.bind(query, fs.readFileSync('./sql/select_site.sql').toString('utf8'), to_response);
let update_site = query.bind(query, fs.readFileSync('./sql/update_site.sql').toString('utf8'), to_response);
let insert_site = query.bind(query, fs.readFileSync('./sql/insert_site.sql').toString('utf8'), to_response);
let delete_site = query.bind(query, fs.readFileSync('./sql/delete_site.sql').toString('utf8'), to_response);

function check_site(site) {
  console.assert(!site.domain || /(^[A-z0-9-.]+$)/.exec(site.domain) !== null, 'The domain name of a site must only use alphanumerics, hyphens and periods.');
  console.assert(site.region, 'Region must be provided.');
  console.assert(site.internal === true || site.internal === false, 'The value of internal must be a boolean value.');
}


async function http_list(pg_pool, req, res, regex) {
  return httph.ok_response(res, JSON.stringify(await select_sites(pg_pool, [])))
}

async function http_get(pg_pool, req, res, regex) {
  let site_id = httph.first_match(req.url, regex)
  let sites_obj = await select_site(pg_pool, [site_id])
  if (!sites_obj || sites_obj.length !== 1) {
    throw new common.NotFoundError('The specified site was not found.')
  }
  return httph.ok_response(res, 
    JSON.stringify(sites_obj[0]));
}

async function http_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let region = null
  try {
    if(typeof(payload.internal) === 'undefined' || payload.internal === null) {
      payload.internal = false
    }
    if(!payload.region) {
      region = await common.alamo.default_region(pg_pool)
    } else {
      region = await common.alamo.region(pg_pool, payload.region)
    }
    payload.region = region.name
    check_site(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let sites_obj = await select_site(pg_pool, [payload.domain])
  if (sites_obj.length !== 0) {
    throw new common.UnprocessibleEntityError('The specified site already exists.')
  }
  let data = await common.alamo.sites.create_domain(pg_pool, payload.region, payload.domain, payload.internal)
  let site_id = uuid.v4();
  let created_updated = new Date();
  sites_obj = await insert_site(pg_pool, [site_id, payload.domain, region.region, created_updated, created_updated, payload.internal ? 'compliance=internal' : ''])
  sites_obj[0].region = {
    "name":region.name,
    "id":region.region
  }
  return httph.created_response(res, JSON.stringify(sites_obj[0]))
}

async function http_delete(pg_pool, req, res, regex){
  let site_id = httph.first_match(req.url, regex)
  let sites_obj = await select_site(pg_pool, [site_id])
  if(sites_obj.length === 0) {
    throw new common.NotFoundError(`The specified site was not found (${site_id}).`)
  } else {
    await delete_site(pg_pool, [site_id])
    await common.alamo.sites.delete_domain(pg_pool, sites_obj[0].region.name, sites_obj[0].domain)
    return httph.ok_response(res, JSON.stringify(sites_obj[0]))
  }
}

module.exports = {
  http:{
    get: http_get,
    list: http_list,
    create: http_create,
    delete: http_delete
  }
};