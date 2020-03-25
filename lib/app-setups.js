const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const apps = require('./apps.js');
const addons = require('./addons.js');
const addon_attachments = require('./addon-attachments.js');
const builds = require('./builds.js');
const config_vars = require('./config-var.js');
const common = require('./common.js');
const features = require('./features.js');
const filters = require('./filters.js');
const formation = require('./formations.js');
const logs = require('./log-drains');
const query = require('./query.js');
const pipelines = require('./pipelines.js');

// private
async function format_source_blob_from_build(pg_pool, app_uuid, app_name, space_name, build) {
  if (!build) {
    return null;
  }
  // for returning the build image lets use the GM from this app, rather than the build sources, as they may
  // not exist if this is a pipelined app.

  const desc = await common.alamo.app_describe(pg_pool, `${app_name}-${space_name}`);
  return {
    checksum: build.source_blob.checksum,
    url: `docker://${desc.image}`,
    version: build.source_blob.version,
  };
}

// private
function format_log_drains(drains) {
  return drains.map((drain) => ({
    url: drain.url,
    token: drain.token,
  }));
}

// private
function format_addons(addon_list) {
  const addons_formatted = {};
  addon_list.forEach((x) => {
    addons_formatted[x.addon_service.name] = { plan: x.plan.name };
  });
  return addons_formatted;
}

// private
function format_attachments(attachments) {
  return attachments.map((x) => ({ name: x.name, app: x.addon.app, id: x.addon.id }));
}

// private
function format_features(feat) {
  return feat.map((x) => ({ name: x.name, id: x.id, enabled: x.enabled }));
}


// private
function format_filters(filts) {
  return filts.map((x) => ({ filter: { id: x.filter.filter }, options: x.attachment_options }));
}

// private
function format_formations(formations) {
  const formations_formatted = {};
  formations.forEach((form) => {
    formations_formatted[form.type] = {
      quantity: form.quantity,
      size: form.size.replace(/-prod/g, ''),
    };
    if (form.type === 'web') {
      formations_formatted[form.type].port = form.port;
      formations_formatted[form.type].healthcheck = form.healthcheck;
    }
    formations_formatted[form.type].command = form.command;
  });
  return formations_formatted;
}

// private
// function format_sites(routes) {
//   const sites_formatted = {};
//   routes.forEach((route) => {
//     sites_formatted[route.site] = sites_formatted[route.site] || { routes: [] };
//     sites_formatted[route.site].routes.push({ source_path: route.source_path, target_path: route.target_path });
//   });
//   return sites_formatted;
// }

// private
function format_config_vars(vars, notes) {
  const keys = Object.keys(vars);
  const formatted_config_vars = {};
  keys.forEach((key) => {
    formatted_config_vars[key] = {
      description: '',
      required: (vars[key].indexOf('[redacted]') > -1),
    };
    if (notes[key] && notes[key].description) {
      formatted_config_vars[key].description = notes[key].description;
    }
    if (notes[key] && (notes[key].required === false || notes[key].required === true)) {
      formatted_config_vars[key].required = notes[key].required;
    }
    if (vars[key].indexOf('[redacted]') === -1) {
      formatted_config_vars[key].value = vars[key];
    }
  });
  return formatted_config_vars;
}

// private
function format_pipeline_couplings(pipeline_list) {
  return pipeline_list.map((coupling) => ({
    pipeline: coupling.name,
    stage: coupling.stage,
    required_status_checks: coupling.required_status_checks,
  }));
}

// public
const select_app_setup = query.bind(query, fs.readFileSync('./sql/select_app_setup.sql').toString('utf8'), (r) => r);
async function get_setup_status(pg_pool, app_setup_uuid) {
  const app_setups = await select_app_setup(pg_pool, [app_setup_uuid]);

  if (app_setups.length === 1) {
    let builds_obj = await builds.list(pg_pool, [app_setups[0].app]);
    const response_obj = {
      id: app_setups[0].app_setup,
      created_at: (new Date(app_setups[0].created)).toISOString(),
      updated_at: (new Date(app_setups[0].updated)).toISOString(),
      app: {
        id: app_setups[0].app,
        name: app_setups[0].name,
      },
      progress: app_setups[0].progress,
      status: app_setups[0].status,
      status_message: app_setups[0].status_messages,
      failure_message: app_setups[0].failure_messages,
      manifest_errors: [],
      postdeploy: {
        exit_code: null,
        output: '',
      },
      resolved_success_url: app_setups[0].success_url,
    };
    if (builds_obj && builds_obj.length > 0) {
      builds_obj = builds_obj.sort((a, b) => ((new Date(a.created)).getTime() > (new Date(b.created)).getTime() ? -1 : 1));
      const br = await builds.result(pg_pool, app_setups[0].name, app_setups[0].app, builds_obj[0].id);
      response_obj.build = {
        id: builds_obj[0].id,
        status: builds_obj[0].status,
        lines: br.content,
      };
    }
    return response_obj;
  }
  throw new common.NotFoundError(`The specified app setup id ${app_setup_uuid} was not found.`);
}

async function http_get_setup_status(pg_pool, req, res, regex) {
  const app_setup_uuid = httph.first_match(req.url, regex);
  const app_setup_status = await get_setup_status(pg_pool, app_setup_uuid);
  return httph.ok_response(res, JSON.stringify(app_setup_status));
}

async function get_app_definition(pg_pool, app_key, ignore_build) {
  const app = await common.app_exists(pg_pool, app_key);
  const space = await common.space_exists(pg_pool, app.space_uuid);
  const build = await builds.latest_build(pg_pool, app.app_uuid);
  if (!build && !ignore_build) {
    throw new common.UnprocessibleEntityError(`The application ${app_key} did not have any builds or releases, this is required before an app setup can be created.`);
  }
  let config_var_set = await config_vars.get_app_only(pg_pool, app.app_name, app.space_name);
  const features_result = await features.list(pg_pool, app.app_uuid);
  const formation_result = await formation.list(pg_pool, app.app_uuid);
  const addons_result = await addons.list(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name);
  const attach_result = await addon_attachments.list_by_app(pg_pool, app.app_uuid);
  let logs_result = await logs.list(pg_pool, app.app_uuid, app.app_name, app.space_name);
  const pipeline_result = await pipelines.couplings.list_by_app(pg_pool, [app.app_uuid]);
  const filters_result = await common.filter_attachments_exists(pg_pool, app.app_uuid);
  const config_var_notes = await config_vars.notes.get(pg_pool, app.app_uuid, app.space_name, app.app_name);

  // ensure we filter for socs
  config_var_set = (space.tags.indexOf('compliance=socs') > -1) ? common.socs(config_var_set) : config_var_set;

  // drains added by services should not in its defintion create both the drain and the service, filter
  // them about by matching the drain id to any service id we have.
  logs_result = logs_result.filter((x) => !addons_result.some((y) => y.id === x.id));

  const definition = {
    app: {
      locked: false,
      name: app.app_name,
      organization: app.org_name,
      region: space.region_name,
      personal: false,
      space: app.space_name,
      stack: space.stack_name,
    },
    env: format_config_vars(config_var_set, config_var_notes),
    features: format_features(features_result),
    formation: format_formations(formation_result),
    addons: format_addons(addons_result),
    attachments: format_attachments(attach_result),
    filters: format_filters(filters_result),
    source_blob: (build
      ? await format_source_blob_from_build(pg_pool, app.app_uuid, app.app_name, app.space_name, build)
      : null
    ),
    'log-drains': format_log_drains(logs_result),
    'pipeline-couplings': format_pipeline_couplings(pipeline_result),
  };

  return definition;
}

async function http_get_app_definition(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  httph.ok_response(res, JSON.stringify(await get_app_definition(pg_pool, app_key, false)));
}


// public
function check_setup_config_vars(payload) {
  assert.ok(!payload.env || typeof payload.env === 'object', 'Configuration vars was not an object of key value pairs.');
  const configVars = {};
  if (payload.env) {
    const keys = Object.keys(payload.env);
    for (let i = 0; i < keys.length; i++) {
      const entry = payload.env[keys[i]];

      assert.ok((entry.required && (entry.required === true || entry.required === 'true') && entry.value) || !entry.required,
        `The configuration variable ${keys[i]} was required but not provided`);
      if (entry.value) {
        configVars[keys[i]] = entry.value;
      }
    }
  }
  return configVars;
}


// public
function check_setup_config_var_notes(payload) {
  assert.ok(!payload.env || typeof payload.env === 'object', 'Configuration vars was not an object of key value pairs.');
  const config_var_notes = {};
  if (payload.env) {
    const keys = Object.keys(payload.env);
    for (let i = 0; i < keys.length; i++) {
      const entry = payload.env[keys[i]];
      if (entry.required === true || entry.required === false || entry.description) {
        config_var_notes[keys[i]] = { required: entry.required, description: entry.description };
      }
    }
  }
  return config_var_notes;
}


// public
function check_setup_features(payload) {
  if (payload.features) {
    for (let i = 0; i < payload.features.length; i++) {
      assert.ok(payload.features[i].id, 'The specified feature did not have an id.');
      assert.ok(payload.features[i].name, 'The specified feature did not have a name.');
      assert.ok(payload.features[i].enabled === true || payload.features[i].enabled === false, 'The specified feature did not have a value for enabled.');
    }
    return payload.features;
  }
  return [];
}

// public
function check_setup_formations(payload) {
  assert.ok(!payload.formation || typeof payload.formation === 'object', 'Formation was not an object of key value pairs.');
  if (!payload.formation) {
    return [];
  }
  const formation_types = Object.keys(payload.formation);
  const formations_to_create = [];
  for (let i = 0; i < formation_types.length; i++) {
    const entry = payload.formation[formation_types[i]];
    const new_entry = {
      type: formation_types[i],
      quantity: entry.quantity,
      size: entry.size,
      port: entry.port,
      command: entry.command,
      healthcheck: entry.healthcheck,
    };
    formation.check(new_entry, [entry.size]);
    formations_to_create.push(new_entry);
  }
  return formations_to_create.sort((a /* b */) => (a.type === 'web' ? -1 : 1)); // Ensure web comes first
}

// public
function check_setup_addons(payload) {
  assert.ok(!payload.addons || typeof payload.addons === 'object', 'Addons was not an object of key value pairs.');
  if (!payload.addons) {
    return [];
  }
  const addon_entries = Object.keys(payload.addons);
  const addons_to_create = [];
  for (let i = 0; i < addon_entries.length; i++) {
    const entry = payload.addons[addon_entries[i]];
    assert.ok(entry.plan, `The addon to be created ${addon_entries[i]} did not have a plan associated with it.`);
    addons_to_create.push(entry.plan);
  }
  return addons_to_create;
}

// public
function check_setup_attachments(payload) {
  assert.ok(!payload.attachments || Array.isArray(payload.attachments), 'Attachments was not an array of objects.');
  if (!payload.attachments) {
    return [];
  }
  const attachments = payload.attachments.map((x) => x.id);
  assert.ok(attachments.every((x) => !!x), 'One or more attachments did not contain an id.');
  return attachments;
}

// public
function check_setup_build(payload) {
  if (payload.source_blob) {
    return payload.source_blob.url;
  }
  return null;
}

// public
function check_setup_filters(payload) {
  if (payload.filters) {
    assert.ok(Array.isArray(payload.filters), 'The filters option in the manifest was not an array.');
    return payload.filters;
  }
  return [];
}

// public
function check_setup_drains(payload) {
  return payload['log-drains'] ? payload['log-drains'].map((x) => x.url) : [];
}

// public
function check_setup_couplings(payload) {
  return payload['pipeline-couplings'] ? payload['pipeline-couplings'] : [];
}

// public
const insert_app_setup = query.bind(query, fs.readFileSync('./sql/insert_app_setup.sql').toString('utf8'), (r) => r);
const update_app_setup = query.bind(query, fs.readFileSync('./sql/update_app_setup.sql').toString('utf8'), (r) => r);
async function setup(pg_pool, payload) {
  try {
    payload.app.org = payload.app.organization;
    apps.check_payload(payload.app);
    payload.app.name = payload.app.name.toLowerCase().trim();
    payload.app.space = payload.app.space.toLowerCase().trim();
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }

  try {
    const setup_payload = {};
    // check/transform config vars
    setup_payload.config_vars = check_setup_config_vars(payload);
    // check/transform features
    setup_payload.features = check_setup_features(payload);
    // check/transform formations
    setup_payload.formations = check_setup_formations(payload);
    // check/transform addons to create
    setup_payload.addons = check_setup_addons(payload);
    // check/transform addon_attachments
    setup_payload.attachments = check_setup_attachments(payload);
    // check/transform release
    setup_payload.source_blob_url = check_setup_build(payload);
    // check/transform logs
    setup_payload.drains = check_setup_drains(payload);
    // check/transform pipelines
    setup_payload.couplings = check_setup_couplings(payload);
    // check/transform filters
    setup_payload.filters = check_setup_filters(payload);
    // check/transform config var notes
    setup_payload.config_var_notes = check_setup_config_var_notes(payload);

    // create app
    const app_info = await apps.create(pg_pool, payload.app.org, payload.app.space, payload.app.name);
    const app_setup_uuid = uuid.v4();
    const app_setup = await insert_app_setup(pg_pool, [app_setup_uuid, app_info.id]);
    const app_uuid = app_info.id;
    const app_name = payload.app.name;
    const space_name = app_info.space.name;
    const space_tags = app_info.space.compliance;
    const org = app_info.organization.name;
    const processing = [];

    // create config vars
    processing.push({
      name: 'configuration variables',
      item: config_vars.update.bind(config_vars.update,
        pg_pool,
        app_uuid,
        app_name,
        space_name,
        space_tags,
        org,
        JSON.stringify(setup_payload.config_vars)),
    });

    // create formation
    setup_payload.formations.forEach((form) => {
      processing.push({
        name: `formation creation [${form.type}]`,
        item: formation.create.bind(formation.create,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          space_tags,
          org,
          form.type,
          form.size,
          form.quantity,
          form.command,
          form.port,
          form.healthcheck,
          false,
          null),
      });
    });

    // create addons
    setup_payload.addons.forEach((plan) => {
      processing.push({
        name: `Creating addon ${plan}`,
        item: addons.create.bind(addons.create,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          space_tags,
          org,
          plan),
      });
    });

    // create attachments
    setup_payload.attachments.forEach((attachment) => {
      processing.push({
        name: `Attaching addon ${attachment}`,
        item: addon_attachments.create.bind(addon_attachments.create,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          space_tags,
          org,
          attachment),
      });
    });

    // create log drain
    setup_payload.drains.forEach((drain) => {
      processing.push({
        name: `Creating log drain ${drain}`,
        item: logs.create.bind(logs.create,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          drain),
      });
    });

    // create pipeline couplings
    setup_payload.couplings.forEach((coupling) => {
      processing.push({
        name: `Adding app to pipeline ${coupling.pipeline} at stage ${coupling.stage}`,
        item: pipelines.couplings.create.bind(pipelines.couplings.create,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          org,
          coupling.pipeline,
          coupling.stage,
          coupling.required_status_checks),
      });
    });

    // set features
    setup_payload.features.forEach((feature) => {
      processing.push({
        name: `Updating ${feature.name} and setting it to ${feature.enabled}`,
        item: features.update.bind(features.update,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          feature.name,
          feature.enabled),
      });
    });

    // set filters
    setup_payload.filters.forEach((filter_instance) => {
      processing.push({
        name: `Adding http filter ${filter_instance.filter.id}`,
        item: filters.create_attachment.bind(filters.create_attachment,
          pg_pool,
          app_uuid,
          filter_instance.filter.id,
          filter_instance.options,
          'System'),
      });
    });

    // create a build
    if (setup_payload.source_blob_url) {
      processing.push({
        name: `Building ${setup_payload.source_blob_url}`,
        item: builds.create.bind(builds.create,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          space_tags,
          org,
          null,
          '',
          '',
          '',
          '',
          '',
          setup_payload.source_blob_url),
      });
    }


    // create config var notes
    if (Object.keys(setup_payload.config_var_notes).length > 0) {
      processing.push({
        name: 'configuration variables notes',
        item: config_vars.notes.update.bind(config_vars.notes.update,
          pg_pool,
          app_uuid,
          app_name,
          space_name,
          setup_payload.config_var_notes),
      });
    }

    // execute asyncronously by syncronously within the asyncronous process,
    // as if what i just said isn't going to take you 10 seconds to mull on.
    // this is required, if the statement above ends with a () this could accidently be executed as a deconstructor
    ((async () => {
      const errors = [];
      for (let i = 0; i < processing.length; i++) {
        try {
          console.log(`app-setups (${i + 1}/${processing.length}): ${processing[i].name}`);
          // eslint-disable-next-line no-await-in-loop
          await processing[i].item();
        } catch (e) {
          console.log('app-setup had an error:', e);
          if (e.code && e.message) {
            errors.push(`${processing[i].name} failed [${e.code} ${e.message}]`);
          } else {
            errors.push(`${processing[i].name} failed [${JSON.stringify(e)}`);
          }
        } finally {
          let state = 'pending';
          if (errors.length > 0) {
            state = 'failed';
          } else if (errors.length === 0 && (i + 1) === processing.length) {
            state = 'succeeded';
          }
          // eslint-disable-next-line no-await-in-loop
          await update_app_setup(pg_pool, [app_setup_uuid, ((i + 1) / processing.length), errors.join(', '), state, processing[i].name]);
        }
      }
    })()).catch((e) => {
      console.error('Error [app-setups]: Updating app setup and process failed:');
      console.error(e);
    });

    const app_setup_status = {
      id: app_setup_uuid,
      created_at: (new Date(app_setup[0].created)).toISOString(),
      updated_at: (new Date(app_setup[0].created)).toISOString(),
      app: {
        id: app_uuid,
        name: app_name,
      },
      build: {
        id: null,
        status: 'queued',
        output_stream_url: null,
      },
      progress: 0,
      status: app_setup[0].status,
      failure_message: '',
      manifest_errors: [],
      postdeploy: null,
      resolved_success_url: null,
    };
    return app_setup_status;
  } catch (e) {
    console.error('unable to process app setup:', e);
    throw new common.UnprocessibleEntityError(e.message);
  }
}

async function http_setup(pg_pool, req, res /* regex */) {
  const payload = await httph.buffer_json(req);
  const app_setup_status = await setup(pg_pool, payload);
  return httph.created_response(res, JSON.stringify(app_setup_status));
}


module.exports = {
  create: setup,
  definition: get_app_definition,
  http: {
    create: http_setup,
    get: http_get_setup_status,
    definition: http_get_app_definition,
  },
};
