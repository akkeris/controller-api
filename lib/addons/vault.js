const crypto = require('crypto');
const uuid = require('uuid');
const addons = require('./addons-helper.js');
const common = require('../common.js');

const names_map = {
  ca: 'Career Achievement',
  circles: 'Circles',
  rabbitmq: 'RabbitMQ NTP Email & Friends',
  dctm: 'Documentum',
  edw_read: 'Enterprise Data Warehouse (EDW) - Read Only',
  erm: 'ERM',
  lang: 'Language',
  ntpsearch: 'NTP Search',
  olap: 'OLAP Reporting',
  orch: 'Orchastration',
  p42: 'NTP/P42 Performance',
  peer: 'Peer Comments',
  perf: 'NTP/Performance',
  persdataserv: 'Personalization Data Service (persdataserv)',
  personalization: 'Personalization',
  reportpricing: 'Report Pricing',
  reports: 'Reports',
  scs: 'Supply Chain Systme (Support Team)',
  smarts: 'Smarts',
  xiops: 'XI Operations (xiops)',
  xisoap: 'Expression Soap',
  xpress: 'Expression',
  solr: 'Solar Search',
  nimbus: 'Nimbus',
  xica: 'XICA',
  sap: 'SAP',
  ws: 'Web Service',
  db: 'Database',
  queue: 'Queue',
  tokens: 'Tokens',
  index: 'Index',
  lids: 'Lean Information Delivery System (LIDS)',
  neo4j: 'Neo4j',
  eve: 'OAuth Token Hex Keys (EVE)',
  quay: 'Quay',
  kube: 'Kubernetes',
};

function vault_plans_to_services(vault_plans) {
  const grouping = {};
  vault_plans = vault_plans.map((x) => {
    const n = x.size.split('/');
    const service = {
      name: `${names_map[n[3]] ? names_map[n[3]] : n[3]} ${names_map[n[2]] ? names_map[n[2]] : n[2]} Credentials`,
      key: n[3] + (n[4] ? n[4] : ''),
      environment: n[1],
      type: n[2],
      spec: x.size,
      regions: x.regions,
    };
    return service;
  }).sort((a, b) => {
    a = a.name.toUpperCase();
    b = b.name.toUpperCase();
    if (a < b) {
      return -1;
    } if (a > b) {
      return 1;
    }
    return 0;
  });
  vault_plans.forEach((vp) => {
    const ndx = vp.name + vp.type + vp.key;
    if (grouping[ndx]) {
      grouping[ndx].plans.push({ name: vp.environment, spec: vp.spec, regions: vp.regions });
    } else {
      grouping[ndx] = {
        human_name: vp.name,
        name: vp.key,
        type: vp.type,
        key: vp.key,
        plans: [{ name: vp.environment, spec: vp.spec, regions: vp.regions }],
      };
    }
  });
  return Object.keys(grouping).map((key) => grouping[key]);
}

function cap(text) {
  return !text || text.length === 0 ? '' : text[0].toUpperCase() + text.substring(1);
}

function plans(service, regions) {
  return service.plans.map((plan) => {
    const compliance = (plan.name.indexOf('prod') > -1) || (plan.name.indexOf('prd') > -1);
    return {
      addon_service: {
        id: service.id,
        name: service.key,
      },
      created_at: '2016-09-27T12:00:00Z',
      default: false,
      description: `${cap(plan.name)} ${names_map[service.type] ? names_map[service.type] : service.type} credentials and connection information placed as environment variables in your app when it starts.`,
      human_name: `${cap(service.key)} ${cap(plan.name)} Credentials`,
      id: uuid.unparse(crypto.createHash('sha256').update(service.key + service.type + plan.name).digest(), 16),
      installable_inside_private_network: true,
      installable_outside_private_network: false,
      name: `${service.key}-${service.type}:${plan.name}`,
      key: `${service.key}-${service.type}:${plan.name}`,
      price: {
        cents: 0,
        unit: 'month',
      },
      available_regions: regions.map((x) => x.name),
      compliance: (compliance ? ['prod'] : []),
      space_default: false,
      spec: plan.spec,
      state: 'public',
      updated_at: '2016-09-27T12:00:00Z',
    };
  });
}

function info(service, regions) {
  return {
    actions: [],
    cli_plugin_name: '',
    created_at: '2016-09-27T12:00:00Z',
    description: `${cap(service.name)} ${cap(service.type)} Credentials, see plans for various environments.`,
    human_name: `${cap(service.name)} ${cap(service.type)} Credentials`,
    id: service.id,
    name: `${service.key}-${service.type}`,
    state: 'ga',
    available_regions: regions.map((x) => x.name),
    supports_multiple_installations: false,
    supports_sharing: false,
    updated_at: '2016-09-27T12:00:00Z',
  };
}

async function get_config_vars(pg_pool, service, space_name, app_name) {
  const foreign_id = service.foreign_key.split(':')[1];
  const config_vars = await common.alamo.vault_credentials(pg_pool, foreign_id, space_name, app_name);
  if (!config_vars) {
    console.error('Error, unable to obtain config vars for', foreign_id, 'due to an unknown error');
    throw new common.ServiceUnavailableError('Cannot obtain vault credentials');
  }
  const obj = {};
  if (Array.isArray(config_vars)) {
    config_vars.forEach((val) => {
      obj[val.key] = val.value;
    });
  } else {
    console.warn('alamo-vault.js: warning: Config reported back from vault was not an array:', JSON.stringify(config_vars));
  }
  return obj;
}

async function provision(pg_pool, type, app_uuid, app_name, space_name, org, addon_plan) {
  const specs = addon_plan.spec.split(':');
  const config_service_vars = await get_config_vars(pg_pool, { foreign_key: addon_plan.spec }, space_name, app_name);
  const formations = await common.formations_exists(pg_pool, app_uuid);
  if (formations.length === 0) {
    throw new common.NoFormationsFoundError();
  }
  const results = await Promise.all(
    formations.map(async (form) => common.alamo.bind_service(
      pg_pool, space_name, common.alamo.app_name(app_name, form.type), specs[0], specs[1],
    )),
  );
  return {
    config_vars: config_service_vars,
    foreign_key: addon_plan.spec,
    reply: results,
  };
}

async function unprovision(pg_pool, type, app_uuid, app_name, space_name, org, addon_plan, service) {
  // const spec = service.foreign_key.split(':');
  const formations = await common.formations_exists(pg_pool, app_uuid);
  if (formations.length === 0) {
    throw new common.NoFormationsFoundError();
  }
  await Promise.all(
    formations.map(async (form) => common.alamo.unbind_service(
      pg_pool, space_name, common.alamo.app_name(app_name, form.type), service.foreign_key,
    )),
  );
  return service;
}

function attach(/* pg_pool, app, addon_plan, service */) {
  throw new common.ConflictError('This addon cannot be shared as an attachment.');
}

function detach(/* pg_pool, app, addon_plan, service */) {
  throw new common.ConflictError('This addon cannot be shared as an attachment.');
}

const exempt_list = { p42: true };
function create_service(plan, regions) {
  if (exempt_list[plan.key]) {
    return null;
  }

  plan.id = uuid.unparse(crypto.createHash('sha256').update(plan.key + plan.type).digest(), 16);
  plan.provision = provision;
  plan.unprovision = unprovision;
  plan.config_vars = get_config_vars;

  return {
    config_vars: get_config_vars.bind(null),
    info: info.bind(null, plan, regions),
    plans: plans.bind(null, plan, regions),
    provision: addons.provision.bind(null, plan),
    unprovision: addons.unprovision.bind(null, plan),
    attach,
    detach,
    get_actions: () => null,
    get_state: () => ({ state: 'provisioned', state_description: '' }),
    action: (/* pg_pool, plan, service, app, action_id, req_url */) => { throw new common.NotFoundError('Action not found'); },
    update: () => { throw new common.ConflictError('Cannot upgrade this plan as changes are unsupported'); },
  };
}

module.exports = async function (pg_pool) {
  const vp = await common.alamo.vault_plans(pg_pool, 'vault');
  const regions = await common.alamo.regions(pg_pool);

  return vault_plans_to_services(vp).map((plan) => create_service(plan, regions)).filter((x) => !!x);
};
