"use strict";

const fs = require('fs')
const uuid = require('uuid')
const httph = require('./http_helper.js')
const query = require('./query.js')
const sites = require('./sites.js')
const config = require('./config.js')
const common = require('./common.js')

function to_response(route) {
  return {
    id:route.route,
    app:route.app,
    site:route.site,
    source_path:route.source_path,
    target_path:route.target_path,
    created_at:route.created.toISOString(),
    updated_at:route.updated.toISOString()
  }
}

let select_routes = query.bind(query, fs.readFileSync('./sql/select_routes.sql').toString('utf8'), to_response);
let select_route = query.bind(query, fs.readFileSync('./sql/select_route.sql').toString('utf8'), to_response);
let select_routes_by_app = query.bind(query, fs.readFileSync('./sql/select_routes_by_app.sql').toString('utf8'), to_response);
let select_routes_by_site = query.bind(query, fs.readFileSync('./sql/select_routes_by_site.sql').toString('utf8'), to_response);
let select_route_by_details = query.bind(query, fs.readFileSync('./sql/select_route_by_details.sql').toString('utf8'), to_response);
let update_route = query.bind(query, fs.readFileSync('./sql/update_route.sql').toString('utf8'), to_response);
let delete_route_query = query.bind(query, fs.readFileSync('./sql/delete_route.sql').toString('utf8'), to_response);
let insert_route = query.bind(query, fs.readFileSync('./sql/insert_route.sql').toString('utf8'), to_response);

function check_route(route) {
  console.assert(/(^[A-z0-9_\/-]+$)/.test(route.source_path), 'The source_path of a route must match [A-z0-9_/-]+.');
  if(route.target_path !== '') {
    console.assert(/(^[A-z0-9_\/-]+$)/.test(route.target_path), 'The target_path of a route must match [A-z0-9_/-]+.');
  }
  console.assert(route.site, 'The route must attach to a site. Please specify site ID or domain name.')
}

async function push_routes(pg_pool, region, domain) {
  if(!process.env.TEST_MODE) {
    return await common.alamo.sites.push_routes(pg_pool, region, domain)
  }
}

async function remove_alamo_path(pg_pool, region, domain, source_path) {
  let data = await common.alamo.sites.delete_route(pg_pool, region, domain, source_path)
  await push_routes(pg_pool, region, domain)
  return data
}

async function delete_route(pg_pool, route) {
  let site = await common.site_exists(pg_pool, route.site)
  let routes = await delete_route_query(pg_pool, [route.id])
  if (routes.length === 0) {
    throw new common.NotFoundError("The specified route does not exist.");
  }
  return await remove_alamo_path(pg_pool, site.region_name, site.domain, route.source_path)
}

async function delete_by_app(pg_pool, app_uuid, callback) {
  let routes = await select_routes_by_app(pg_pool, [app_uuid])
  let result = []
  for(let i=0; i < routes.length; i++) {
    result.push(await delete_route(pg_pool, routes[i]))
  }
  return result
}

async function create_alamo_path(pg_pool, domain, space_name, app_name, source_path, target_path) {
  let payload = {
    domain,
    path: source_path,
    space: space_name,
    app: app_name,
    replacepath: target_path
  };
  let data = await common.alamo.sites.create_route(pg_pool, space_name, app_name, domain, source_path, target_path)
  await push_routes(pg_pool, await common.alamo.region_name_by_space(pg_pool, space_name), domain)
  return data
}

async function http_get(pg_pool, req, res, regex) {
  let route_id = httph.first_match(req.url, regex)
  let routes = await select_route(pg_pool, [route_id])
  if(!routes || routes.length !== 1) {
    throw new common.NotFoundError(`The specified route was not found. (${route_id})`)
  }
  return httph.ok_response(res, JSON.stringify(routes[0]))
}

async function http_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    check_route(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let site = await common.site_exists(pg_pool, payload.site)
  let app = await common.app_exists(pg_pool, payload.app)
  let routes = await select_route_by_details(pg_pool, [app.app_uuid, site.site, payload.source_path, payload.target_path])
  if (routes.length !== 0) {
    throw new common.UnprocessibleEntityError(`A route with the specified details already exists. (${payload.source_path} -> ${payload.target_path}`)
  }
  let data = await create_alamo_path(pg_pool, site.domain, app.space_name, app.app_name, payload.source_path, payload.target_path)
  let route_id = uuid.v4();
  let created_updated = new Date();
  routes = await insert_route(pg_pool, [route_id, app.app_uuid, site.site, payload.source_path, payload.target_path, created_updated, created_updated])
  return httph.created_response(res, JSON.stringify(routes[0]));
}

async function http_delete(pg_pool, req, res, regex) {
  let route_id = httph.first_match(req.url, regex)
  let routes = await select_route(pg_pool, [route_id])
  if(!routes || routes.length !== 1) {
    throw new common.NotFoundError(`The specified route was not found. (${route_id})`)
  }
  await delete_route(pg_pool, routes[0])
  return httph.ok_response(res, JSON.stringify(routes[0]))
}

async function http_list(pg_pool, req, res, regex) {
  if(/\/sites\//.test(req.url)) {
    let site_key = httph.first_match(req.url, '/sites/([0-9a-zA-Z.-]+)')
    let site = await common.site_exists(pg_pool, site_key)
    let routes = await select_routes_by_site(pg_pool, [site.site])
    return httph.ok_response(res, JSON.stringify(routes))
  } else if (/\/apps\//.test(req.url)) {
    let app_key = httph.first_match(req.url, '/apps/([0-9a-zA-Z-]+)')
    let app = await common.app_exists(pg_pool, app_key)
    let routes = await select_routes_by_app(pg_pool, [app.app_uuid])
    return httph.ok_response(res, JSON.stringify(routes))
  } else {
    let routes = await select_routes(pg_pool, [])
    return httph.ok_response(res, JSON.stringify(routes))
  }
}


module.exports = {
  http:{
    get: http_get,
    list: http_list,
    create: http_create,
    delete: http_delete,
  },
  list:select_routes_by_app,
  delete_by_app,
  push: push_routes
};
