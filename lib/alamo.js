/**
 ** IMPORTANT:
 ** NEVER CALL THESE FUNCTIONS DIRECTLY, UNLESS YOU ARE THE OWNER OF THIS FEATURE,
 ** THESE ARE RUDEMENTARY CALLS, USE BUSINESS LEVEL OBJECTS TO CREATE RESPECTIVE
 ** RESOURCES FROM OTHER PARTS OF CODE.
 * */

const assert = require('assert');
const fs = require('fs');
const url = require('url');
const config = require('./config.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');

const select_stack_and_region_by_space = query.bind(query, fs.readFileSync('./sql/select_stack_and_region_by_space.sql').toString('utf8'), (r) => r);
const select_region_by_site = query.bind(query, fs.readFileSync('./sql/select_region_by_site.sql').toString('utf8'), (r) => r);
const select_all_regions = query.bind(query, fs.readFileSync('./sql/select_all_regions.sql').toString('utf8'), (r) => r);
const select_all_stacks = query.bind(query, fs.readFileSync('./sql/select_all_stacks.sql').toString('utf8'), (r) => r);
const select_stack = query.bind(query, fs.readFileSync('./sql/select_stack.sql').toString('utf8'), (r) => r);
const select_region = query.bind(query, fs.readFileSync('./sql/select_region.sql').toString('utf8'), (r) => r);
const select_default_stack = query.bind(query, fs.readFileSync('./sql/select_default_stack.sql').toString('utf8'), (r) => r);
const select_default_region = query.bind(query, fs.readFileSync('./sql/select_default_region.sql').toString('utf8'), (r) => r);

function get_api_by_stack_name(stack_name) {
  assert.ok(stack_name && stack_name !== '', 'The stack name provided by get_api_by_stack_name was empty');
  const stack_var_name = `${stack_name.toUpperCase().replace(/-/g, '_')}_STACK_API`;
  if (!process.env[stack_var_name] && config.alamo_url) {
    console.warn(`WARNING: No process env was provided for stack ${stack_name}. Using default ${config.alamo_url} which will soon be deprecated!`);
  } else if (!process.env[stack_var_name] && !config.alamo_url) {
    console.error(`ERROR: No stack api url was provided in configuration for ${stack_name}, expecting ${stack_var_name} in environment!`);
    throw new http_help.InternalServerError('Internal Server Error');
  }
  return http_help.clean_forward_slash(process.env[stack_var_name] || config.alamo_url);
}

function get_api_by_region_name(region_name) {
  assert.ok(region_name && region_name !== '', 'The region name provided by get_api_by_region_name was empty');
  const region_var_name = `${region_name.toUpperCase().replace(/-/g, '_')}_REGION_API`;
  if (!process.env[region_var_name] && config.alamo_url) {
    console.warn(`WARNING: No process env was provided for region ${region_name}. Using default ${config.alamo_url} which will soon be deprecated!`);
  } else if (!process.env[region_var_name] && !config.alamo_url) {
    console.error(`ERROR: No region api url was provided in configuration for ${region_name}, expecting ${region_var_name} in environment!`);
    throw new http_help.InternalServerError('Internal Server Error');
  }
  return http_help.clean_forward_slash(process.env[region_var_name] || config.alamo_url);
}

// function get_api_by_cluster_name(full_cluster_name) {
// assert.ok(
//  full_cluster_name && full_cluster_name.match(/^[^-]+-.+$/),
//  'The cluster name provided by get_api_by_region_name was empty or invalid.',
// );
//   const [_, region_name] = full_cluster_name.match(/^[^-]+-(.+)$/);
//   return get_api_by_region_name(region_name);
// }

async function get_stack(pg_pool, stack_name) {
  const stack = await select_stack(pg_pool, [stack_name]);
  if (stack.length !== 1) {
    throw new http_help.NotFoundError(`Unable to find region ${stack_name}.`);
  }
  return stack[0];
}

async function get_region(pg_pool, region_name) {
  const region = await select_region(pg_pool, [region_name]);
  if (region.length !== 1) {
    throw new http_help.NotFoundError(`Unable to find region ${region_name}.`);
  }
  return region[0];
}

async function default_stack(pg_pool) {
  const stack = await select_default_stack(pg_pool, []);
  if (stack.length !== 1) {
    throw new http_help.UnprocessibleEntityError('Unable to determine a default stack, please specify one.');
  }
  return stack[0];
}

async function default_region(pg_pool) {
  const region = await select_default_region(pg_pool, []);
  if (region.length !== 1) {
    throw new http_help.UnprocessibleEntityError('Unable to determine a default region, please specify one.');
  }
  return region[0];
}

const api_cache = {};
async function fetch_api_by_space(pg_pool, space_name) {
  assert.ok(space_name, 'The space for api urls was not found');
  if (!api_cache[space_name]) {
    const info = await select_stack_and_region_by_space(pg_pool, [space_name]);
    if (info && info.length > 0) {
      [api_cache[space_name]] = info;
      api_cache[space_name].stack_api = get_api_by_stack_name(info[0].stack_name);
      api_cache[space_name].region_api = get_api_by_region_name(info[0].region_name);
    } else {
      console.log('ERROR: region and stack api does not exist for space:', space_name);
      api_cache[space_name] = {
        stack_name: 'default',
        region_name: 'default',
        stack_api: config.alamo_url,
        region_api: config.alamo_url,
      };
    }
  }
  return api_cache[space_name];
}

async function fetch_api_by_site(pg_pool, site_name) {
  assert.ok(site_name, 'The site for api urls was not found');
  if (!api_cache[site_name]) {
    const info = await select_region_by_site(pg_pool, [site_name]);
    if (info && info.length > 0) {
      [api_cache[site_name]] = info;
      api_cache[site_name].region_api = get_api_by_region_name(info[0].region_name);
    } else {
      console.log('ERROR: region and stack api does not exist for site:', site_name);
      api_cache[site_name] = {
        stack_name: 'default',
        region_name: 'default',
        stack_api: config.alamo_url,
        region_api: config.alamo_url,
      };
    }
  }
  return api_cache[site_name];
}

async function get_region_name_by_space(pg_pool, space_name) {
  const info = await fetch_api_by_space(pg_pool, space_name);
  return info.region_name;
}

async function get_region_api_by_space(pg_pool, space_name) {
  const info = await fetch_api_by_space(pg_pool, space_name);
  return info.region_api;
}

async function get_region_api_by_site(pg_pool, site_name) {
  const info = await fetch_api_by_site(pg_pool, site_name);
  return info.region_api;
}

async function get_all_regions(pg_pool) {
  const regions = await select_all_regions(pg_pool, []);
  return regions.map((r) => ({ name: r.region_name, url: get_api_by_region_name(r.region_name) }));
}

async function get_all_stacks(pg_pool) {
  const stacks = await select_all_stacks(pg_pool, []);
  return stacks.map((r) => ({ name: r.stack_name, url: get_api_by_stack_name(r.stack_name) }));
}

async function alamo_fetch(method, uri, payload, headers) {
  headers = headers || {};
  headers = Object.assign(headers, config.alamo_headers);

  const purl = new url.URL(uri);
  uri = `${purl.protocol}//${purl.host}${purl.pathname}`;

  if (purl.auth && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Basic ${(Buffer.from(purl.auth)).toString('base64')}`;
  }

  if (!uri.startsWith('https://') && !uri.startsWith('http://')) {
    console.error(`Unable to use call ${method} ${uri}, the url did not start with https or http.`);
    throw new http_help.InternalServerError('Internal Server Error');
  }
  if (method.toLowerCase() !== 'get' && payload && (typeof payload !== 'string')) {
    payload = JSON.stringify(payload);
  }

  let data = await http_help.request(method, uri, headers, payload);
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // do nothing, leave it as a string
    }
  }
  return data;
}

function get_alamo_app_name(app_name, formation_type) {
  return app_name + (formation_type === 'web' ? '' : `--${formation_type}`);
}

async function app_describe(pg_pool, app_name) {
  const apparray = app_name.split('-');
  const alamoapp = apparray[0];
  const space = apparray.slice(1).join('-');
  const appd = await alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamoapp}`, null);
  return appd;
}

async function request_config_set(pg_pool, app_name, space_name, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set/${bind_name}`, null);
}

async function create_config_set(pg_pool, app_name, space_name, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set`,
    JSON.stringify({
      name: bind_name, space: space_name, appname: app_name, type: 'app',
    }));
}

async function delete_configvar_map(pg_pool, space_name, app_name, bindname, bindtype, map_id) {
  return alamo_fetch(
    'delete',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${app_name}/bindmap/${bindtype}/${bindname}/${map_id}`,
    null,
  );
}

async function create_configvar_map(
  pg_pool,
  space_name,
  app_name,
  bindname,
  bindtype,
  action,
  existing_var_name,
  new_var_name,
) {
  return alamo_fetch(
    'post',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${app_name}/bindmap/${bindtype}/${bindname}`,
    JSON.stringify({
      appname: app_name, space: space_name, bindtype, bindname, action, varname: existing_var_name, newname: new_var_name,
    }),
  );
}

async function mapped_service_config_vars(pg_pool, space_name, app_name, bindname, bindtype) {
  try {
    const config_vars = await alamo_fetch(
      'get',
      `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${app_name}/configvars/${bindtype}/${bindname}`,
      null,
      { 'x-silent-error': 'true' },
    );
    const obj = {};
    // we should standardize this, but we can get both objects or potentially arrays back form this.
    if (Array.isArray(config_vars)) {
      config_vars.forEach((val) => {
        if (val.name !== 'spec') {
          obj[val.name] = val.value;
        }
      });
    } else {
      const keys = Object.keys(config_vars);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key !== 'spec') {
          obj[key] = config_vars[key];
        }
      }
    }
    return obj;
  } catch (e) {
    if (e.code === 500 || e.code === 422) {
      return {};
    }
    throw e;
  }
}

async function include_config_set(pg_pool, parent_space_name, parent_type, parent_name, child_type, child_name) {
  await alamo_fetch('post', `${await get_region_api_by_space(pg_pool, parent_space_name)}/v1/config/set/${parent_name}/include/${child_name}`, null);
}

async function exclude_config_set(pg_pool, parent_space_name, parent_type, parent_name, child_type, child_name) {
  await alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, parent_space_name)}/v1/config/set/${parent_name}/include/${child_name}`, null);
}

async function delete_config_set(pg_pool, app_name, space_name, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set/${bind_name}`, null);
}

async function add_config_vars(pg_pool, app_name, space_name, set, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set/configvar`,
    JSON.stringify(Object.keys(set).map((x) => ({ setname: bind_name, varname: x, varvalue: set[x].toString() }))));
}

async function add_config_var(pg_pool, app_name, space_name, name, value, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set/configvar`,
    JSON.stringify([{ setname: bind_name, varname: name, varvalue: value.toString() }]));
}

async function update_config_var(pg_pool, app_name, space_name, name, value, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('patch', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set/configvar`,
    JSON.stringify({ setname: bind_name, varname: name, varvalue: value.toString() }));
}

async function delete_config_var(pg_pool, app_name, space_name, name, service_name) {
  const bind_name = service_name || `${app_name}-${space_name}`;
  return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space_name)}/v1/config/set/${bind_name}/configvar/${name}`, null);
}

async function osb_catalog(pg_pool) {
  return (await Promise.all((await get_all_regions(pg_pool))
    .map(async (region) => {
      try {
        return (await alamo_fetch('get', `${region.url}/v2/catalog`, null, { 'x-silent-error': true })).services.map((x) => {
          x.plans = x.plans.map((p) => ({ regions: [region.name], ...p }));
          return { regions: [region.name], ...x };
        });
      } catch (e) {
        return [];
      }
    })))
    // reduce the array of arrays to one array of services
    .reduce((x, y) => x.concat(y), [])
    // reduce the services
    .reduce((services, service) => {
      const matched_service = services.filter((s) => s.id === service.id);
      if (matched_service.length === 1) {
        matched_service[0].regions = matched_service[0].regions.concat(service.regions);
        matched_service[0].plans = matched_service[0].plans.concat(service.plans);
      } else {
        services = services.concat(service);
      }
      return services;
    }, [])
    // reduce the plans
    .map((service) => {
      service.plans = service.plans.reduce((plans, plan) => {
        const matched_plan = plans.filter((p) => p.id === plan.id);
        if (matched_plan.length === 1) {
          matched_plan[0].regions = matched_plan[0].regions.concat(plan.regions);
        } else {
          plans = plans.concat(plan);
        }
        return plans;
      }, []);
      return service;
    });
}

async function osb_action(pg_pool, app_name, space_name, method, service_foreign_key, action_id, payload) {
  const spec = service_foreign_key.split(':');
  assert(spec.length === 2, 'The spec for the service on osb action did not have two parts');
  return alamo_fetch(method, `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${spec[1]}/actions/${action_id}`, payload);
}

async function service_plans(pg_pool, service_name) {
  return (await Promise.all((await get_all_regions(pg_pool))
    .map(async (region) => {
      try {
        return (await alamo_fetch(
          'get',
          `${region.url}/v1/service/${service_name}/plans`,
          null,
          { 'x-silent-error': true },
        )).map((x) => ({ regions: [region.name], ...x }));
      } catch (e) {
        return [];
      }
    })))
    .reduce((plans, reg_plans) => plans
    // if any existing plans already have a plan in reg_plans add its regions.
      .map((plan) => Object.assign(plan, {
        regions: plan.regions.concat(
          reg_plans.filter((reg_plan) => plan.size === reg_plan.size).reduce((sum, x) => sum.concat(x.regions), []),
        ),
      }))
    // concat all regional_plans which are not in the current plans.
      .concat(reg_plans.filter((reg_plan) => !plans.some((plan) => reg_plan.size === plan.size))), []);
}

async function vault_plans(pg_pool) {
  return (await Promise.all((await get_all_regions(pg_pool))
    .map(async (region) => (await alamo_fetch('get', `${region.url}/v1/service/vault/plans`, null, { 'X-Timeout': 1000 * 120 }))
      .map((result) => ({ size: result, description: result, regions: [region.name] })))))
    .reduce((plans, reg_plans) => plans
    // if any existing plans already have a plan in reg_plans add its regions.
      .map((plan) => Object.assign(plan, {
        regions: plan.regions.concat(
          reg_plans.filter((reg_plan) => plan.size === reg_plan.size).reduce((sum, x) => sum.concat(x.regions), []),
        ),
      }))
    // concat all regional_plans which are not in the current plans.
      .concat(reg_plans.filter((reg_plan) => !plans.some((plan) => reg_plan.size === plan.size))), []);
}

let sizes_cache = null;
async function sizes(pg_pool) {
  assert.ok(pg_pool, 'Sizes did not recieve a pg_pool connector');
  if (sizes_cache) {
    return sizes_cache;
  }
  sizes_cache = (await Promise.all((await get_all_regions(pg_pool))
    .map(async (stack) => (await alamo_fetch('get', `${stack.url}/v1/apps/plans`, null)).map((x) => ({ stacks: [stack.name], ...x })))))
    .reduce((plans, reg_plans) => plans
    // if any existing plans already have a plan in reg_plans add its stacks.
      .map((plan) => Object.assign(plan, {
        stacks: plan.stacks.concat(
          reg_plans.filter((reg_plan) => plan.name === reg_plan.name).reduce((sum, x) => sum.concat(x.stacks), []),
        ),
      }))
    // concat all regional_plans which are not in the current plans.
      .concat(reg_plans.filter((reg_plan) => !plans.some((plan) => reg_plan.name === plan.name))), []);
  return sizes_cache;
}

async function sizes_by_space(pg_pool, space_name) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/apps/plans`, null);
}

const template_urls = {};
async function template_by_space(pg_pool, space_name) {
  if (template_urls[space_name]) {
    return template_urls[space_name];
  }
  template_urls[space_name] = await alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/utils/urltemplates`, null);
  return template_urls[space_name];
}

async function dyno_service_exists(pg_pool, app_name, space_name) {
  try {
    const service = await alamo_fetch(
      'get',
      `${await get_region_api_by_space(pg_pool, space_name)}/v1/utils/service/space/${space_name}/app/${app_name}`,
      null,
      { 'x-silent-error': true },
    );
    return service.kind === 'Service';
  } catch (e) {
    if (e.code === 404) {
      return false;
    }
    throw e;
  }
}

async function get_alamo_namespaces(pg_pool) {
  return Promise.all((await get_all_stacks(pg_pool)).map(async (x) => alamo_fetch('get', `${x.url}/v1/spaces`, null)));
}

async function service_config_vars(pg_pool, service_name, service_id, space_name /* app_name */) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/service/${service_name}/url/${service_id}`, null);
}

async function get_kafka_hosts(pg_pool, space_name) {
  return (await alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v2/config`, null)).kafka_hosts;
}

async function create_service(pg_pool, service_name, plan, tags, space_name /* app_name */) {
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/service/${service_name}/instance`, { plan, billingcode: tags });
}

async function create_osb_service(pg_pool, type, service_id, plan_id, addon_id, org_id, space_name /* app_name */) {
  return alamo_fetch(
    'put',
    `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${addon_id}?accepts_incomplete=true`,
    {
      service_id,
      plan_id,
      content: {
        platform: 'akkeris',
        organization: { id: org_id },
        space: { name: space_name },
      },
      organization_guid:
      org_id,
    },
  );
}

async function update_osb_service(pg_pool, space_name, service_id, plan_id, addon_id) {
  return alamo_fetch(
    'patch',
    `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${addon_id}?accepts_incomplete=true`,
    { service_id, plan_id, previous_values: null },
  );
}

async function get_osb_status(pg_pool, service_id, plan_id, addon_id, space_name /* app_name */) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${addon_id}/last_operation`, null);
}

async function create_osb_bindings(pg_pool, service_id, plan_id, addon_id, space_name, app_name) {
  try {
    return alamo_fetch(
      'put',
      `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${addon_id}/service_bindings/${app_name}-${space_name}`,
      { service_id, plan_id },
      { 'x-silent-error': true },
    );
  } catch (e) {
    if (e.code === 422) {
      // indicates the broker is still creating, but acknowledges it.
    } else {
      throw e;
    }
  }
  return null;
}

async function delete_osb_bindings(pg_pool, service_id, plan_id, addon_id, space_name, app_name) {
  try {
    return alamo_fetch(
      'delete',
      `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${addon_id}/service_bindings/${app_name}-${space_name}`,
      null,
      { 'x-silent-error': true },
    );
  } catch (e) {
    if (e.code === 422) {
      // indicates the broker is still creating, but acknowledges it.
    } else {
      throw e;
    }
  }
  return null;
}

async function delete_osb_service(pg_pool, type, service_id, plan_id, org_id, space_name /* app_name */) {
  return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space_name)}/v2/service_instances/${service_id}`, null);
}

async function delete_service(pg_pool, service_name, spec, space_name /* app_name */) {
  return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space_name)}/v1/service/${service_name}/instance/${spec}`, null);
}

async function bind_service(pg_pool, space_name, alamo_app_name, type, name) {
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/bind`, {
    appname: alamo_app_name, space: space_name, bindtype: type, bindname: name,
  });
}

async function unbind_service(pg_pool, space_name, alamo_app_name, foreign_key) {
  return alamo_fetch(
    'delete',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/bind/${foreign_key}`,
    null,
  );
}

async function vault_credentials(pg_pool, service_id, space_name /* app_name */) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/service/vault/credentials/${service_id}`, null);
}

async function create_log_drain(pg_pool, type, key, destination_url) {
  if (type === 'app') {
    const keys = key.split('-');
    const app_name = keys[0];
    const space_name = keys.slice(1).join('-');
    return alamo_fetch(
      'post',
      `${await get_region_api_by_space(pg_pool, space_name)}/apps/${app_name}-${space_name}/log-drains`,
      { url: destination_url },
    );
  }
  return alamo_fetch('post', `${await get_region_api_by_site(pg_pool, key)}/sites/${key}/log-drains`, { url: destination_url });
}

async function list_log_drains(pg_pool, type, key) {
  if (type === 'app') {
    const keys = key.split('-');
    const app_name = keys[0];
    const space_name = keys.slice(1).join('-');
    return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/apps/${app_name}-${space_name}/log-drains`, null);
  }
  return alamo_fetch('get', `${await get_region_api_by_site(pg_pool, key)}/sites/${key}/log-drains`, null);
}

async function get_log_drains(pg_pool, type, key, drain_id) {
  if (type === 'app') {
    const keys = key.split('-');
    const app_name = keys[0];
    const space_name = keys.slice(1).join('-');
    return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/apps/${app_name}-${space_name}/log-drains/${drain_id}`, null);
  }
  return alamo_fetch('get', `${await get_region_api_by_site(pg_pool, key)}/sites/${key}/log-drains/${drain_id}`, null);
}

async function delete_log_drain(pg_pool, type, key, drain_id) {
  if (type === 'app') {
    const keys = key.split('-');
    const app_name = keys[0];
    const space_name = keys.slice(1).join('-');
    return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space_name)}/apps/${app_name}-${space_name}/log-drains/${drain_id}`, null);
  }
  return alamo_fetch('delete', `${await get_region_api_by_site(pg_pool, key)}/sites/${key}/log-drains/${drain_id}`, null);
}

/// deprecated ///
async function create_log_session(pg_pool, type, key, lines, tail) {
  if (type === 'app') {
    const keys = key.split('-');
    const app_name = keys[0];
    const space_name = keys.slice(1).join('-');
    return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/log-sessions`, JSON.stringify({
      app: app_name,
      space: space_name,
      lines,
      tail: (!!tail),
    }));
  }
  return alamo_fetch('post', `${await get_region_api_by_site(pg_pool, key)}/log-sessions`, JSON.stringify({
    site: key,
    lines,
    tail: (!!tail),
  }));
}

async function create_log_tail(pg_pool, space_name, hostname, lines, tail) {
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/tails`, JSON.stringify({
    hostname,
    lines,
    tail: (!!tail),
  }));
}

async function create_log_event(pg_pool, space_name, app_name, text) {
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/log-events`, JSON.stringify({
    log: text,
    stream: 'stdout',
    time: ((new Date()).toISOString()),
    docker: {
      container_id: '',
    },
    kubernetes:
    {
      namespace_name: space_name,
      pod_id: '',
      pod_name: 'akkeris/event',
      container_name: app_name,
      labels: {
        name: '',
      },
      host: '',
    },
    topic: space_name,
    tag: '',
  }));
}

async function dyno_create(pg_pool, name, space, type, port, size, healthcheck) {
  const alamo_name = get_alamo_app_name(name, type);
  const app_params = {
    appname: alamo_name,
    appport: type === 'web' ? port : -1,
  };

  // add app-dyno, we ignore whether this succeds or fails, its fairly inconsequential, ignore errors produced.
  try {
    await alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space)}/v1/app`, JSON.stringify(app_params), { 'x-ignore-errors': 'true' });
  } catch (e) {
    // do nothing
  }
  // add app-dyno to space
  const payload = JSON.stringify({
    instances: 1,
    plan: size,
    healthcheck: type === 'web' ? healthcheck : null,
  });
  await alamo_fetch('put', `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}`, payload);
  // copy the bindings from the source app to the dest app, if
  // the source and the dest are the same just apply the config bind.
  // return {bindings:(await create_dyno_bindings(name, space, alamo_name, space))};

  const app_info = await alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${name}`, null);
  // trap condition that should never happen, we should never have an app that's different from the source
  // with no bindings to copy, otherwise we've ran into quite the unusual case...
  if ((app_info.bindings === null || app_info.bindings.length === 0) && (name !== alamo_name)) {
    console.warn(`FATAL ERROR: We tried to copy the bindings from two different kubernetes containers,
               this normally should ALWAYS have bindings on the source but had none! Investigate this!
                - source: kubernetes( container: ${name}, namespace: ${space}
                - target: kubernetes( container: ${alamo_name}, namespace: ${space}`);
  }
  if ((app_info.bindings === null || app_info.bindings.length === 0)) {
    // this is a brand new app, we just need to bind to our own config set.
    return [await alamo_fetch(
      'post',
      `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/bind`,
      JSON.stringify({
        appname: alamo_name,
        space,
        bindtype: 'config',
        bindname: `${name}-${space}`,
      }),
    )];
  }
  return Promise.all(
    app_info.bindings.map(async (binding) => alamo_fetch(
      'post',
      `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/bind`,
      JSON.stringify({
        appname: alamo_name,
        space,
        bindtype: binding.bindtype,
        bindname: binding.bindname,
      }),
    )),
  );
}

async function dyno_delete(pg_pool, name, space, type) {
  const alamo_name = get_alamo_app_name(name, type);
  // Unbind config set, dyno thing, keep it here.
  const bindings = await alamo_fetch(
    'delete',
    `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/bind/config:${name}-${space}`,
    null,
  );
  // Remove dyno from space.
  await alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}`, null);
  // Remove dyno completely, this is somewhat inconsequential, so do not care about the error if any are returned.
  alamo_fetch(
    'delete',
    `${await get_region_api_by_space(pg_pool, space)}/v1/app/${alamo_name}`,
    null,
    { 'x-ignore-errors': 'true' },
  ).catch(() => { /* Do not care */ });
  return { bindings };
}

async function maintenance_page(pg_pool, space_name, alamo_app_name, torf) {
  if (torf === true) {
    return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/maintenance`, null);
  }
  if (torf === false) {
    return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/maintenance`, null);
  }
  return null;
}

async function dyno_stop(pg_pool, space_name, alamo_app_name, dyno_id) {
  return alamo_fetch(
    'delete',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/instance/${alamo_app_name}-${dyno_id}`,
    null,
  );
}

async function dyno_status(pg_pool, space_name, alamo_app_name) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/kube/podstatus/${space_name}/${alamo_app_name}`, null);
}

async function dyno_info(pg_pool, space_name, alamo_app_name) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/instance`, null);
}

async function dyno_restart(pg_pool, space_name, alamo_app_name) {
  return alamo_fetch(
    'post',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_app_name}/restart`,
    null,
    { 'x-ignore-errors': 'true' },
  );
}

async function dyno_scale(pg_pool, app_name, space_name, type, instances) {
  const alamo_name = get_alamo_app_name(app_name, type);
  return alamo_fetch(
    'put',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/app/${alamo_name}/scale`,
    JSON.stringify({ instances }),
  );
}

async function dyno_change_port(pg_pool, name, space, port) {
  return update_config_var(pg_pool, name, space, 'PORT', port);
}

async function dyno_change_plan(pg_pool, name, space, type, plan) {
  const alamo_name = get_alamo_app_name(name, type);
  return alamo_fetch('put', `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/plan`, JSON.stringify({ plan }));
}

async function dyno_change_healthcheck(pg_pool, name, space, type, healthcheck) {
  const alamo_name = get_alamo_app_name(name, type);
  return alamo_fetch(
    'put',
    `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/healthcheck`,
    JSON.stringify({ healthcheck }),
  );
}

async function dyno_remove_healthcheck(pg_pool, name, space, type) {
  const alamo_name = get_alamo_app_name(name, type);
  return alamo_fetch('delete', `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/healthcheck`, null);
}

async function dyno_attach(pg_pool, space, name, type, instance, command, stdin) {
  const alamo_name = get_alamo_app_name(name, type);
  return alamo_fetch(
    'post',
    `${await get_region_api_by_space(pg_pool, space)}/v1/space/${space}/app/${alamo_name}/instance/${instance}/exec`,
    JSON.stringify({ command, stdin }),
  );
}

async function create_alamo_namespace(pg_pool, space, internal, compliancetags) {
  compliancetags = compliancetags.join(',');
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space)}/v1/space`, JSON.stringify({ name: space, internal, compliancetags }));
}

// public
// Kubenetes requires we break up commands into an array, hopefully this adequately splits the command into
// an appropriate command array with the 0th value being the command. Note that while i hoped to have something
// built in to use (or a library) I couldn't find one, so here's my best attempt that accounts for quotes.
function parse_command_args(arg) {
  const args = arg.split(' ');
  const targets = [];

  let inside_quote = false;
  let leaving_quote = false;
  args.forEach((x) => {
    if (x === '') {
      return;
    }
    if (x[0] === '"') {
      inside_quote = true;
      x = x.substring(1);
    }
    if (x[x.length - 1] === '"' && inside_quote) {
      x = x.substring(0, x.length - 1);
      leaving_quote = true;
    }
    if (inside_quote) {
      if (!targets[targets.length - 1]) {
        // TODO: ESLint - ask Trevor about this
        targets[targets.length - 1] === ''; // eslint-disable-line
      }
      targets[targets.length - 1] += ` ${x}`;
    } else {
      targets.push(x);
    }
    if (leaving_quote) {
      inside_quote = leaving_quote = false;
    }
  });
  return targets;
}

let deploying = false;
async function deploy(
  pg_pool,
  space_name,
  app_name,
  formation_type,
  image,
  command,
  port,
  healthcheck,
  features,
  labels,
  filters,
) {
  try {
    // Lock so only one deployment may ever happen at one time, prevents us from making
    // more than one deployment request before we've received the A-OK from another one.
    let timed = 0;
    while (deploying && timed < 20) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
      timed++;
    }
    deploying = true;
    const alamo_app_name = get_alamo_app_name(app_name, formation_type);
    labels = labels || {};
    filters = filters || [];
    if (!command || command === '') {
      command = null;
    } else {
      command = parse_command_args(command);
    }
    if (formation_type !== 'web') {
      port = -1;
    }
    labels = {
      'akkeris.io/app-name': app_name,
      'akkeris.io/dyno-type': formation_type,
      ...labels,
    };
    if (process.env.DEBUG) {
      console.log('[debug] Deploying', JSON.stringify({
        appname: alamo_app_name, appimage: image, space: space_name, command, port, features, labels, filters,
      }, null, 2));
    }
    await alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/app/deploy`, {
      appname: alamo_app_name, appimage: image, space: space_name, command, port, features, labels, filters,
    }, { 'x-silent-error': 'true' });
  } finally {
    deploying = false;
  }
}

// Region-api requires environment variables in a different format than the controller
// Controller: { "key": "value" }
// Region-api: [{ name: "key", value: "value" }]
// Convert controller syntax to region-api syntax
function parse_oneoff_env(env) {
  const newenv = [];
  if (env) {
    Object.keys(env).forEach((key) => {
      newenv.push({
        name: key,
        value: env[key],
      });
    });
  }
  return newenv;
}

async function oneoff_deploy(
  pg_pool,
  space_name,
  app_name,
  formation_type,
  image,
  command,
  labels,
  env,
  size,
  runid,
) {
  try {
    // Lock so only one deployment may ever happen at one time, prevents us from making
    // more than one deployment request before we've received the A-OK from another one.
    let timed = 0;
    while (deploying && timed < 20) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
      timed++;
    }
    deploying = true;

    const alamo_app_name = get_alamo_app_name(app_name, formation_type);

    labels = {
      'akkeris.io/app-name': app_name,
      'akkeris.io/dyno-type': formation_type,
      ...(labels || {}),
    };

    const region_env = parse_oneoff_env(env);

    const payload = {
      podname: alamo_app_name,
      image,
      space: space_name,
      command: (!command || command === '') ? null : parse_command_args(command),
      labels,
      plan: size,
      runid,
      ...(region_env.length > 0 && { env: region_env }),
    };

    if (process.env.DEBUG) {
      console.log('[debug] Deploying One-off', JSON.stringify(payload, null, 2));
    }

    await alamo_fetch(
      'post',
      `${await get_region_api_by_space(pg_pool, space_name)}/v1/app/deploy/oneoff`,
      payload,
      { 'x-silent-error': 'true' },
    );
  } finally {
    deploying = false;
  }
}

async function oneoff_stop(pg_pool, space_name, app_name, formation_type) {
  const podname = get_alamo_app_name(app_name, formation_type);
  await alamo_fetch(
    'delete',
    `${await get_region_api_by_space(pg_pool, space_name)}/v1/space/${space_name}/oneoff/${podname}`,
    { 'x-silent-error': 'true' },
  );
}

/*
 * Topics
 */

function handleKafkaHttpError(e, method, uri) {
  console.info(`Error from backend service: ${method} ${uri} -> ${e.code}`);
  if (e.stack) {
    console.info(e.stack);
  } else {
    console.info(e);
  }
  if (e instanceof http_help.HttpError && e.internal_error) {
    let message = '';
    try {
      const error = JSON.parse(e.internal_error.message);
      message = (
        error.errors
        && error.errors instanceof Array
        && error.errors.length > 0
        && error.errors[0].title
        && error.errors[0].detail
      ) ? `${error.errors[0].title}: ${error.errors[0].detail}`
        : e.internal_error.message;
    } catch (ex) {
      message = e.internal_error.message;
    }
    console.info(message);
    throw new http_help.UnprocessibleEntityError(message);
  } else {
    console.info(e.message, e.stack);
    throw e;
  }
}

async function create_topic(region, cluster, name, conf, partitions, retention_ms) {
  const payload = {
    topic: {
      name,
      config: {
        name: conf,
      },
    },
  };
  if (partitions) {
    payload.topic.config.partitions = partitions;
  }
  if (retention_ms) {
    payload.topic.config['retention.ms'] = retention_ms;
  }

  const method = 'post';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/topic`;
  try {
    return alamo_fetch(method, uri, payload, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

/*
 * Topics
 */
async function delete_topic(region, cluster, name) {
  const method = 'delete';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/topics/${name}`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function get_topic(region, name) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/topics/${name}`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method.uri);
  }
  return null;
}

async function get_topic_preview(region, cluster, name) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/topics/${name}/preview`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function list_topics(region) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/topics`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

/*
 * ACLs for topics
 */

async function create_topic_acl(region, cluster, topic, app_name, space_name, role, consumerGroupName) {
  const payload = {
    topic,
    app: app_name,
    space: space_name,
    role,
    consumerGroupName,
  };
  const method = 'post';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/acls`;
  try {
    return alamo_fetch(method, uri, payload, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function delete_topic_acl(region, acl_id) {
  const method = 'delete';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/acls/${acl_id}`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function get_topic_acls(region, cluster, topic) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/acls?topic=${topic}`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function list_consumer_groups(region, cluster) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/consumer-groups`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function list_consumer_group_offsets(region, cluster, consumer_group_name) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/consumer-groups/${consumer_group_name}/offsets`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function list_consumer_group_members(region, cluster, consumer_group_name) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/consumer-groups/${consumer_group_name}/members`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function seek_consumer_group(region, cluster, consumer_group_name, payload) {
  const method = 'post';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/consumer-groups/${consumer_group_name}/seek`;
  try {
    return alamo_fetch(method, uri, payload, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

/*
 * Avro schemas
 */

async function list_schemas(region, cluster) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/schemas`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function list_schema_mappings(region, cluster, topic) {
  const method = 'get';
  const uri = `${get_api_by_region_name(region)}/v1/kafka/cluster/${cluster}/topics/${topic}/topic-schema-mappings`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function create_key_mapping(region, cluster, topic, keytype, schema) {
  const payload = { topic, keyType: keytype.toLowerCase() };
  if (schema) {
    payload.schema = { name: schema };
  }
  const method = 'post';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/topic-key-mapping`;
  try {
    return alamo_fetch(method, uri, payload, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function create_value_mapping(region, cluster, topic, schema) {
  const payload = {
    topic,
    schema: {
      name: schema,
    },
  };
  const method = 'post';
  const uri = `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/topic-schema-mapping`;
  try {
    return alamo_fetch(method, uri, payload, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

/*
 * Config sets for topics
 */
// async function get_topic_config(region, cluster, name) {
// return alamo_fetch('get', `${get_api_by_region_name(region)}/v1/service/kafka/cluster/${cluster}/configs/${name}`);
// }

async function list_topic_configs(region, cluster) {
  if (!region || !cluster) {
    throw new Error('Provide region and cluster');
  }
  const method = 'get';
  const uri = `${get_api_by_region_name(region, true)}/v1/service/kafka/cluster/${cluster}/configs`;
  try {
    return alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }
  return null;
}

async function get_topic_config(region, cluster, name) {
  let configs;
  const method = 'get';
  const uri = `${get_api_by_region_name(region, true)}/v1/service/kafka/cluster/${cluster}/configs`;
  try {
    configs = await alamo_fetch(method, uri, { 'x-silent-error': true });
  } catch (e) {
    handleKafkaHttpError(e, method, uri);
  }

  if (!configs || !configs.configs) {
    throw new http_help.ServiceUnavailableError('Could not fetch topic configs.');
  }

  const byName = configs.configs.filter((conf) => conf.name === name);
  if (!byName.length === 1) {
    throw new http_help.UnprocessibleEntityError(`No config found by topic type ${name}.`);
  }

  const conf = byName[0];
  return {
    cleanup_policy: conf['cleanup.policy'],
    state: conf.state,
    name: conf.name,
    partitions: conf.partitions,
    replicas: conf.replicas,
    retention_ms: conf['retention.ms'],
  };
}

async function create_route(pg_pool, space_name, app_name, domain, source_path, target_path, filters) {
  const payload = {
    domain,
    path: source_path,
    space: space_name,
    app: app_name,
    replacepath: target_path,
    filters,
  };
  return alamo_fetch('post', `${await get_region_api_by_space(pg_pool, space_name)}/v1/router/${domain}/path`, payload);
}

async function delete_route(pg_pool, region_name, domain, source_path) {
  return alamo_fetch('delete', `${get_api_by_region_name(region_name)}/v1/router/${domain}/path`, { path: source_path });
}

async function push_routes(pg_pool, region_name, domain) {
  return alamo_fetch('put', `${get_api_by_region_name(region_name)}/v1/router/${domain}`, {});
}

async function create_domain(pg_pool, region_name, domain, internal) {
  return alamo_fetch('post', `${get_api_by_region_name(region_name)}/v1/router/`, { domain, internal });
}

async function delete_domain(pg_pool, region_name, domain) {
  return alamo_fetch('delete', `${get_api_by_region_name(region_name)}/v1/router/${domain}`, null);
}

async function get_domains(pg_pool) {
  return (await Promise.all((await get_all_regions(pg_pool))
    .map((region) => alamo_fetch('get', `${get_api_by_region_name(region.name)}/v1/domains`, null)))).flat();
}

async function certificate_status(region_name, id) {
  return alamo_fetch('get', `${get_api_by_region_name(region_name)}/v1/certs/${id}`, null);
}

async function certificate_install(region_name, id) {
  return alamo_fetch('post', `${get_api_by_region_name(region_name)}/v1/certs/${id}/install`, null);
}

async function certificate_request(region_name, comment, common_name, subject_alternative_names, requestor) {
  return alamo_fetch('post', `${get_api_by_region_name(region_name)}/v1/certs`, JSON.stringify({
    comment, common_name, subject_alternative_names, requestor,
  }));
}

async function es_status(pg_pool, space_name, app_name, service_id /* action_id */) {
  return alamo_fetch('get', `${await get_region_api_by_space(pg_pool, space_name)}/v1/service/es/instance/${service_id}/status`, null);
}

module.exports = {
  deploy,
  oneoff_deploy,
  oneoff_stop,
  default_stack,
  default_region,
  stack: get_stack,
  region: get_region,
  regions: get_all_regions,
  stacks: get_all_stacks,
  app_name: get_alamo_app_name,
  apps: {
    maintenance_page,
  },
  spaces: {
    list: get_alamo_namespaces,
    create: create_alamo_namespace,
  },
  topics: {
    create: create_topic,
    list: list_topics,
    get: get_topic,
    preview: get_topic_preview,
    delete: delete_topic,
  },
  topic_acls: {
    create: create_topic_acl,
    delete: delete_topic_acl,
    get: get_topic_acls,
  },
  consumer_groups: {
    list: list_consumer_groups,
    offsets: list_consumer_group_offsets,
    members: list_consumer_group_members,
    seek: seek_consumer_group,
  },
  topic_configs: {
    get: get_topic_config,
    list: list_topic_configs,
  },
  topic_schemas: {
    get: list_schemas,
    get_mappings: list_schema_mappings,
    create_key_mapping,
    create_value_mapping,
  },
  sites: {
    create_route,
    delete_route,
    push_routes,
    create_domain,
    delete_domain,
    get_domains,
  },
  es: {
    status: es_status,
  },
  parse_command_args,
  sizes,
  sizes_by_space,
  service_plans,
  service_config_vars,
  create_service,
  bind_service,
  unbind_service,
  delete_service,
  vault_plans,
  config: {
    set: {
      create: create_config_set,
      delete: delete_config_set,
      request: request_config_set,
    },
    include: include_config_set,
    exclude: exclude_config_set,
    update: update_config_var,
    batch: add_config_vars,
    add: add_config_var,
    delete: delete_config_var,
  },
  tails: {
    create: create_log_tail,
  },
  drains: {
    create: create_log_drain,
    get: get_log_drains,
    list: list_log_drains,
    delete: delete_log_drain,
    event: create_log_event,
    session: create_log_session,
  },
  app_describe,
  dyno: {
    service_exists: dyno_service_exists,
    create: dyno_create,
    delete: dyno_delete,
    stop: dyno_stop,
    info: dyno_info,
    status: dyno_status,
    restart: dyno_restart,
    scale: dyno_scale,
    change_port: dyno_change_port,
    change_plan: dyno_change_plan,
    change_healthcheck: dyno_change_healthcheck,
    remove_healthcheck: dyno_remove_healthcheck,
    attach: dyno_attach,
  },
  certificate: {
    status: certificate_status,
    install: certificate_install,
    create: certificate_request,
  },
  url_templates: template_by_space,
  region_name_by_space: get_region_name_by_space,
  region_api_by_space: get_region_api_by_space,
  vault_credentials,
  delete_configvar_map,
  create_configvar_map,
  mapped_service_config_vars,
  osb_catalog,
  get_osb_status,
  create_osb_service,
  create_osb_bindings,
  delete_osb_service,
  delete_osb_bindings,
  osb_action,
  update_osb_service,
  get_kafka_hosts,
};
