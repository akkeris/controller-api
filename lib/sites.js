
const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const query = require('./query.js');
const common = require('./common.js');
const routes = require('./routes.js');

function to_response(site) {
  return {
    id: site.site,
    domain: site.domain,
    region: {
      id: site.region,
      name: site.region_name,
    },
    description: site.description,
    labels: site.labels,
    created_at: site.created.toISOString(),
    updated_at: site.updated.toISOString(),
    compliance: site.tags.split(',').map((x) => x.replace('compliance=', '')).filter((x) => x !== ''),
  };
}

// eslint-disable-next-line max-len
// const select_routes_by_site = query.bind(query, fs.readFileSync('./sql/select_routes_by_site.sql').toString('utf8'), null);
const select_sites = query.bind(query, fs.readFileSync('./sql/select_sites.sql').toString('utf8'), to_response);
const select_site = query.bind(query, fs.readFileSync('./sql/select_site.sql').toString('utf8'), to_response);
// const update_site = query.bind(query, fs.readFileSync('./sql/update_site.sql').toString('utf8'), to_response);
const update_site_info = query.bind(query, fs.readFileSync('./sql/update_site_info.sql').toString('utf8'), to_response);
const insert_site = query.bind(query, fs.readFileSync('./sql/insert_site.sql').toString('utf8'), to_response);
const delete_site = query.bind(query, fs.readFileSync('./sql/delete_site.sql').toString('utf8'), to_response);
const select_preview_sites = query.bind(query, fs.readFileSync('./sql/select_preview_sites.sql').toString('utf8'), null);
const update_site_preview = query.bind(query, fs.readFileSync('./sql/update_site_preview.sql').toString('utf8'), null);

async function http_list(pg_pool, req, res /* regex */) {
  return httph.ok_response(res, JSON.stringify(await select_sites(pg_pool, [])));
}

async function http_get(pg_pool, req, res, regex) {
  const site_id = httph.first_match(req.url, regex);
  const sites_obj = await select_site(pg_pool, [site_id]);
  if (!sites_obj || sites_obj.length !== 1) {
    throw new common.NotFoundError('The specified site was not found.');
  }
  return httph.ok_response(res,
    JSON.stringify(sites_obj[0]));
}

async function http_update(pg_pool, req, res, regex) {
  const site_id = httph.first_match(req.url, regex);
  const sites_obj = await select_site(pg_pool, [site_id]);
  if (!sites_obj || sites_obj.length !== 1) {
    throw new common.NotFoundError('The specified site was not found.');
  }
  const payload = await httph.buffer_json(req);
  const description = payload.description || '';
  const labels = payload.labels || '';
  const sites_updated = await update_site_info(pg_pool, [site_id, description, labels]);
  return httph.ok_response(res, JSON.stringify(sites_updated[0]));
}

async function create(pg_pool, internal, region, domain, description, labels) {
  let region_uuid = null;
  let region_name = null;
  description = description || '';
  labels = labels || '';
  try {
    if (typeof (internal) === 'undefined' || internal === null) {
      internal = false;
    }
    if (!region) {
      region = await common.alamo.default_region(pg_pool);
    } else {
      region = await common.alamo.region(pg_pool, region);
    }
    region_uuid = region.region;
    region_name = region.name;
    assert.ok(
      !domain || /(^[A-z0-9-.]+$)/.exec(domain) !== null,
      'The domain name of a site must only use alphanumerics, hyphens and periods.',
    );
    assert.ok(region_name, 'Region must be provided.');
    assert.ok(internal === true || internal === false, 'The value of internal must be a boolean value.');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  let sites_obj = await select_site(pg_pool, [domain]);
  if (sites_obj.length !== 0) {
    throw new common.UnprocessibleEntityError('The specified site already exists.');
  }
  await common.alamo.sites.create_domain(pg_pool, region_name, domain, internal);
  const site_id = uuid.v4();
  const created_updated = new Date();
  sites_obj = await insert_site(
    pg_pool,
    [
      site_id,
      domain,
      region_uuid,
      created_updated,
      created_updated,
      internal ? 'compliance=internal' : '',
      description,
      labels,
    ],
  );
  sites_obj[0].region = {
    name: region_name,
    id: region_uuid,
  };
  return sites_obj[0];
}

async function del(pg_pool, site_key) {
  const site = await common.site_exists(pg_pool, site_key);
  const rs = await routes.list_by_site(pg_pool, [site.site]);
  // delete all routes
  await Promise.all(rs.map(async (route) => routes.delete(pg_pool, route, true)));
  const non_pending_routes = rs.filter((x) => x.pending !== true);

  // Do not inform region api if the site has no existing routes
  if (non_pending_routes.length !== 0) {
    try {
      await routes.push(pg_pool, site.region_name, site.domain);
    } catch (e) {
      console.log(`Error pushing region: ${site.region_name} site: ${site.domain}`, e);
    }
  }
  // delete site
  await delete_site(pg_pool, [site.site]);
  await common.alamo.sites.delete_domain(pg_pool, site.region_name, site.domain);
  return site;
}

async function http_create(pg_pool, req, res /* regex */) {
  const payload = await httph.buffer_json(req);
  return httph.created_response(
    res,
    JSON.stringify(await create(
      pg_pool,
      payload.internal,
      payload.region,
      payload.domain,
      payload.description,
      payload.labels,
    )),
  );
}

async function http_delete(pg_pool, req, res, regex) {
  const site_key = httph.first_match(req.url, regex);
  return httph.ok_response(res, JSON.stringify(await del(pg_pool, site_key)));
}

async function enable_preview(pg_pool, site_uuid, preview_uuid) {
  return update_site_preview(pg_pool, [site_uuid, preview_uuid]);
}

async function remove_previews(pg_pool, app_uuid) {
  const sites = await select_preview_sites(pg_pool, [app_uuid]);
  await Promise.all(sites
    .filter((site) => site.preview_target !== null && site.preview_target === app_uuid)
    .map((site) => del(pg_pool, site.site)));
  return sites;
}

module.exports = {
  http: {
    get: http_get,
    list: http_list,
    create: http_create,
    delete: http_delete,
    update: http_update,
  },
  create,
  enable_preview,
  remove_previews,
};
