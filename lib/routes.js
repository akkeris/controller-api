const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const query = require('./query.js');
const common = require('./common.js');

function to_response(route) {
  return {
    id: route.route,
    app: {
      id: route.app,
      name: `${route.app_name}-${route.space_name}`,
    },
    space: {
      name: route.space_name,
    },
    site: {
      id: route.site,
      domain: route.domain,
      region: route.region,
      compliance: route.tags ? route.tags.split(',').map((x) => x.replace('compliance=', '')).filter((x) => x !== '') : [],
      preview: route.preview ? { id: route.preview } : null,
    },
    pending: route.pending,
    source_path: route.source_path,
    target_path: route.target_path,
    created_at: route.created.toISOString(),
    updated_at: route.updated.toISOString(),
  };
}

const select_routes = query.bind(query, fs.readFileSync('./sql/select_routes.sql').toString('utf8'), to_response);
const select_route = query.bind(query, fs.readFileSync('./sql/select_route.sql').toString('utf8'), to_response);
const select_routes_by_app = query.bind(query, fs.readFileSync('./sql/select_routes_by_app.sql').toString('utf8'), to_response);
const select_routes_by_site = query.bind(query, fs.readFileSync('./sql/select_routes_by_site.sql').toString('utf8'), to_response);
const select_route_by_details = query.bind(query, fs.readFileSync('./sql/select_route_by_details.sql').toString('utf8'), to_response);
const select_routes_by_pending = query.bind(query, fs.readFileSync('./sql/select_routes_by_pending.sql').toString('utf8'), to_response);
const update_route = query.bind(query, fs.readFileSync('./sql/update_route.sql').toString('utf8'), to_response);
const delete_route_query = query.bind(query, fs.readFileSync('./sql/delete_route.sql').toString('utf8'), to_response);
const insert_route = query.bind(query, fs.readFileSync('./sql/insert_route.sql').toString('utf8'), to_response);

function check_route(route) {
  assert.ok(/(^[A-z0-9_/.-]+$)/.test(route.source_path), 'The source_path of a route must match [A-z0-9_/-.]+.');
  if (route.target_path !== '') {
    assert.ok(/(^[A-z0-9_/.-]+$)/.test(route.target_path), 'The target_path of a route must match [A-z0-9_/-]+.');
  }
  assert.ok(route.site, 'The route must attach to a site. Please specify site ID or domain name.');
}

async function push_routes(pg_pool, region, domain) {
  return common.alamo.sites.push_routes(pg_pool, region, domain);
}

async function remove_alamo_path(pg_pool, region, domain, source_path, donotpush) {
  const data = await common.alamo.sites.delete_route(pg_pool, region, domain, source_path);
  if (!donotpush) {
    await push_routes(pg_pool, region, domain);
  }
  return data;
}

async function delete_route(pg_pool, route, donotpush) {
  const site = await common.site_exists(pg_pool, route.site.id);
  const routes = await delete_route_query(pg_pool, [route.id]);
  if (routes.length === 0) {
    throw new common.NotFoundError('The specified route does not exist.');
  }
  if (route.pending !== true) {
    return remove_alamo_path(pg_pool, site.region_name, site.domain, route.source_path, donotpush);
  }
  return undefined;
}

async function delete_by_app(pg_pool, app_uuid /* callback */) {
  const routes = await select_routes_by_app(pg_pool, [app_uuid]);
  const result = [];
  for (let i = 0; i < routes.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    result.push(await delete_route(pg_pool, routes[i]));
  }
  return result;
}

async function create_alamo_path(pg_pool, domain, space_name, app_name, app_uuid, source_path, target_path, donotpush) {
  const data = await common.alamo.sites.create_route(
    pg_pool,
    space_name,
    app_name,
    domain,
    source_path,
    target_path,
    await common.deployment_filters(pg_pool, app_uuid, 'web'),
  );
  if (!donotpush) {
    await push_routes(pg_pool, await common.alamo.region_name_by_space(pg_pool, space_name), domain);
  }
  return data;
}

async function http_get(pg_pool, req, res, regex) {
  const route_id = httph.first_match(req.url, regex);
  const routes = await select_route(pg_pool, [route_id]);
  if (!routes || routes.length !== 1) {
    throw new common.NotFoundError(`The specified route was not found. (${route_id})`);
  }
  return httph.ok_response(res, JSON.stringify(routes[0]));
}

async function create(pg_pool, site_uuid, app_uuid, source_path, target_path, donotpush) {
  try {
    check_route({ site: site_uuid, source_path, target_path });
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  const site = await common.site_exists(pg_pool, site_uuid);
  const app = await common.app_exists(pg_pool, app_uuid);
  if (app.space_tags.includes('internal') && !site.tags.includes('internal')) {
    throw new common.UnprocessibleEntityError('Cannot route an external site to an internal app.');
  }
  if (!app.space_tags.includes('internal') && site.tags.includes('internal')) {
    throw new common.UnprocessibleEntityError('Cannot route an internal site to an external app.');
  }
  let routes = await select_route_by_details(pg_pool, [site.site, source_path]);
  if (routes.length !== 0) {
    throw new common.UnprocessibleEntityError('A route with this path already exists.');
  }
  let pending = false;
  if (await common.alamo.dyno.service_exists(pg_pool, app.app_name, app.space_name)) {
    await create_alamo_path(
      pg_pool, site.domain, app.space_name, app.app_name, app.app_uuid, source_path, target_path, donotpush,
    );
  } else {
    pending = true;
  }
  const route_id = uuid.v4();
  const created_updated = new Date();
  routes = await insert_route(
    pg_pool,
    [
      route_id,
      app.app_uuid,
      site.site,
      source_path,
      target_path,
      pending,
      created_updated,
      created_updated,
    ],
  );
  return routes[0];
}

async function http_create(pg_pool, req, res /* regex */) {
  const payload = await httph.buffer_json(req);
  const route = await create(pg_pool, payload.site, payload.app, payload.source_path, payload.target_path, false);
  return httph.created_response(res, JSON.stringify(route));
}

async function http_delete(pg_pool, req, res, regex) {
  const route_id = httph.first_match(req.url, regex);
  const routes = await select_route(pg_pool, [route_id]);
  if (!routes || routes.length !== 1) {
    throw new common.NotFoundError(`The specified route was not found. (${route_id})`);
  }
  await delete_route(pg_pool, routes[0]);
  return httph.ok_response(res, JSON.stringify(routes[0]));
}

async function http_list(pg_pool, req, res /* regex */) {
  if (/\/sites\//.test(req.url)) {
    const site_key = httph.first_match(req.url, '/sites/([0-9a-zA-Z.-]+)');
    const site = await common.site_exists(pg_pool, site_key);
    const routes = await select_routes_by_site(pg_pool, [site.site]);
    return httph.ok_response(res, JSON.stringify(routes));
  } if (/\/apps\//.test(req.url)) {
    const app_key = httph.first_match(req.url, '/apps/([0-9a-zA-Z-]+)');
    const app = await common.app_exists(pg_pool, app_key);
    const routes = await select_routes_by_app(pg_pool, [app.app_uuid]);
    return httph.ok_response(res, JSON.stringify(routes));
  }
  const routes = await select_routes(pg_pool, []);
  return httph.ok_response(res, JSON.stringify(routes));
}

async function init(pg_pool) {
  common.lifecycle.on('released', async (payload) => {
    try {
      if (payload.app.name && payload.space.name && payload.app.id) {
        const routes = await select_routes_by_pending(pg_pool, [payload.app.id]);
        let sites_to_push = [];
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          // eslint-disable-next-line no-await-in-loop
          await update_route(pg_pool, [route.id, null, null, false]);
          sites_to_push.push(route.site.domain);
          try {
            // eslint-disable-next-line no-await-in-loop
            await create_alamo_path(
              pg_pool,
              route.site.domain,
              route.space.name,
              route.app.name,
              payload.app.id,
              route.source_path,
              route.target_path,
              true,
            );
          } catch (e) {
            console.log(`Error creating route path for ${route.site.domain} ${route.space.name} ${route.app.name} ${route.source_path} ${route.target_path}`, e);
          }
        }
        sites_to_push = Array.from(new Set(sites_to_push));
        for (let i = 0; i < sites_to_push.length; i++) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await push_routes(
              pg_pool,
              await common.alamo.region_name_by_space(pg_pool, payload.space.name), // eslint-disable-line no-await-in-loop
              sites_to_push[i],
            );
          } catch (e) {
            console.log(`Error pushing routes ${sites_to_push[i]}`, e);
          }
        }
      }
    } catch (e) {
      console.error('Error: unable to process routes for', payload);
      console.error(e);
    }
  });
}

module.exports = {
  http: {
    get: http_get,
    list: http_list,
    create: http_create,
    delete: http_delete,
  },
  create,
  init,
  list: select_routes_by_app,
  list_by_site: select_routes_by_site,
  delete_by_app,
  delete: delete_route,
  push: push_routes,
};
