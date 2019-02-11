
const assert = require('assert')
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const apps = require('./apps.js');
const auto_builds = require('./auto_builds.js');
const addons = require('./addons.js');
const addon_attachments = require('./addon-attachments.js');
const builds = require('./builds.js');
const config = require('./config.js');
const config_vars = require('./config-var.js');
const common = require('./common.js');
const features = require('./features.js');
const formation = require('./formations.js');
const logs = require('./log-drains');
const spaces = require('./spaces.js');
const releases = require('./releases.js');
const orgs = require('./organizations.js');
const query = require('./query.js');
const pipelines = require('./pipelines.js');

// private
async function format_source_blob_from_build(pg_pool, app_uuid, app_name, space_name, build) {
  if(!build) {
    return null;
  }
  // for returning the build image lets use the GM from this app, rather than the build sources, as they may 
  // not exist if this is a pipelined app. 

  let desc = await common.alamo.app_describe(pg_pool, `${app_name}-${space_name}`)
  return {
    "checksum":build.source_blob.checksum,
    "url":`docker://${desc.image}` ,
    "version":build.source_blob.version
  };
}

// private
function format_log_drains(drains) {
  return drains.map((drain) => {
    return {
      "url":drain.url,
      "token":drain.token
    }
  })
}

// private
function format_addons(addons) {
  let addons_formatted = {}
  addons.forEach((x) => { addons_formatted[x.addon_service.name] = {plan:x.plan.name} });
  return addons_formatted
}

// private
function format_attachments(attachments) {
  return attachments.map((x) => { return { "name":x.name, "app":x.addon.app, "id":x.addon.id }});
}

// private
function format_features(feat) {
  return feat.map((x) => { return {"name":x.name,  "id":x.id, "enabled":x.enabled} });
}

// private
function format_formations(formations) {
  let formations_formatted = {};
  formations.forEach((form) => { 
    formations_formatted[form.type] = {
      "quantity":form.quantity,
      "size":form.size.replace(/-prod/g, '')
    }
    if(form.type === "web") {
      formations_formatted[form.type].port = form.port;
      formations_formatted[form.type].healthcheck = form.healthcheck;
    }
    formations_formatted[form.type].command = form.command;
  });
  return formations_formatted;
}

// private
function format_sites(routes) {
  let sites_formatted = {};
  routes.forEach((route) => { 
    sites_formatted[route.site] = sites_formatted[route.site] || {routes:[]};
    sites_formatted[route.site].routes.push({"source_path":route.source_path, "target_path":route.target_path});
  });
  return sites_formatted;
}

// private
function format_config_vars(vars) {
  let keys = Object.keys(vars);
  let formatted_config_vars = {};
  keys.forEach((key) => {
    formatted_config_vars[key] = {
      "description":"",
      "required":(vars[key].indexOf("[redacted]") > -1)
    };
    if(vars[key].indexOf('[redacted]') === -1) {
      formatted_config_vars[key].value = vars[key];
    }
  });
  return formatted_config_vars;
}

// private
function format_pipeline_couplings(pipelines) {
  return pipelines.map((coupling) => {
    return {
      "pipeline":coupling.name,
      "stage":coupling.stage
    }
  })
}

// public
const select_app_setup = query.bind(query, fs.readFileSync('./sql/select_app_setup.sql').toString('utf8'), (r) => { return r; });
async function get_setup_status(pg_pool, app_setup_uuid) {
  let app_setups = await select_app_setup(pg_pool, [app_setup_uuid]);

  if(app_setups.length === 1) {
    let builds_obj = await builds.list(pg_pool, [app_setups[0].app]);
    let response_obj = {
      "id":app_setups[0].app_setup,
      "created_at":(new Date(app_setups[0].created)).toISOString(),
      "updated_at":(new Date(app_setups[0].updated)).toISOString(),
      "app":{
        "id":app_setups[0].app,
        "name":app_setups[0].name
      },
      "progress":app_setups[0].progress,
      "status":app_setups[0].status,
      "status_message":app_setups[0].status_messages,
      "failure_message":app_setups[0].failure_messages,
      "manifest_errors":[],
      "postdeploy":{
        "exit_code":null,
        "output":""
      },
      "resolved_success_url":app_setups[0].success_url
    };
    if(builds_obj && builds_obj.length > 0) {
      builds_obj = builds_obj.sort((a, b) => { return (new Date(a.created)).getTime() > (new Date(b.created)).getTime() ? -1 : 1 });
      let br = await builds.result(pg_pool, app_setups[0].name, app_setups[0].app, builds_obj[0].id)
      response_obj.build = {
        "id":builds_obj[0].id,
        "status":builds_obj[0].status,
        "lines":br.content
      }
    }
    return response_obj
  } else {
    throw new common.NotFoundError(`The specified app setup id ${app_setup_uuid} was not found.`)
  }
}

async function http_get_setup_status(pg_pool, req, res, regex) {
  let app_setup_uuid = httph.first_match(req.url, regex);
  let app_setup_status = await get_setup_status(pg_pool, app_setup_uuid)
  return httph.ok_response(res, JSON.stringify(app_setup_status));
}

async function get_app_definition(pg_pool, app_key, ignore_build) {
  let app               = await common.app_exists(pg_pool, app_key)
  let space             = await common.space_exists(pg_pool, app.space_uuid)
  let build             = await builds.latest_build(pg_pool, app.app_uuid)
  if(!build && !ignore_build) {
    throw new common.UnprocessibleEntityError(`The application ${app_key} did not have any builds or releases, this is required before an app setup can be created.`)
  }
  let config_var_set    = await config_vars.get_app_only(pg_pool, app.app_name, app.space_name)
  let features_result   = await features.list(pg_pool, app.app_uuid)
  let formation_result  = await formation.list_types(pg_pool, app.app_name, app.space_name)
  let addons_result     = await addons.list(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name)
  let attach_result     = await addon_attachments.list_by_app(pg_pool, app.app_uuid)
  let logs_result       = await logs.list(pg_pool, app.app_uuid, app.app_name, app.space_name)
  let pipeline_result   = await pipelines.couplings.list_by_app(pg_pool, [app.app_uuid])

  // ensure we filter for socs
  config_var_set        = (space.tags.indexOf('compliance=socs') > -1) ? common.socs(config_var_set) : config_var_set

  // drains added by services should not in its defintion create both the drain and the service, filter
  // them about by matching the drain id to any service id we have.
  logs_result = logs_result.filter((x) => !addons_result.some((y) => y.id === x.id))

  let definition = {
    "app":{
      "locked":false,
      "name":app.app_name,
      "organization":app.org_name,
      "region":space.region_name,
      "personal":false,
      "space":app.space_name,
      "stack":space.stack_name
    }
    , "env":format_config_vars(config_var_set)
    , "features":format_features(features_result)
    , "formation":format_formations(formation_result)
    , "addons":format_addons(addons_result)
    , "attachments":format_attachments(attach_result)
    , "source_blob":(build ? await format_source_blob_from_build(pg_pool, app.app_uuid, app.app_name, app.space_name, build) : null)
    , "log-drains":format_log_drains(logs_result)
    , "pipeline-couplings":format_pipeline_couplings(pipeline_result)
  }

  return definition
}

async function http_get_app_definition(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  httph.ok_response(res, JSON.stringify(await get_app_definition(pg_pool, app_key, false)));
}


// public
function check_setup_config_vars(payload) {
  assert.ok(!payload.env || typeof payload.env === "object", "Configuration vars was not an object of key value pairs.");
  let config_vars = {};
  if(payload.env) {
    let keys = Object.keys(payload.env);
    for(let i=0; i < keys.length; i++) {
      let entry = payload.env[keys[i]];

      assert.ok( ( entry.required && (entry.required === true || entry.required === "true") && entry.value ) || !entry.required,
        'The configuration variable ' + keys[i] + ' was required but not provided' );
      if(entry.value) {
        config_vars[keys[i]] = entry.value;
      }
    }
  }
  return config_vars;
}


// public
function check_setup_features(payload) {
  if(payload.features) {
    for(let i=0; i < payload.features.length; i++) {
      assert.ok(payload.features[i].id, 'The specified feature did not have an id.')
      assert.ok(payload.features[i].name, 'The specified feature did not have a name.')
      assert.ok(payload.features[i].enabled === true || payload.features[i].enabled === false, 'The specified feature did not have a value for enabled.')
    }
    return payload.features
  } else {
    return []
  }
}

// public
function check_setup_formations(payload) {
  assert.ok(!payload.formation || typeof payload.formation === "object", "Formation was not an object of key value pairs.");
  if(!payload.formation) {
    return [];
  }
  let formation_types = Object.keys(payload.formation)
  let formations_to_create = []
  for(let i=0; i < formation_types.length; i++) {
    let entry = payload.formation[formation_types[i]];
    let new_entry = {
      "type":formation_types[i],
      "quantity":entry.quantity,
      "size":entry.size,
      "port":entry.port,
      "command":entry.command,
      "healthcheck":entry.healthcheck
    };
    formation.check(new_entry, [entry.size]);
    formations_to_create.push(new_entry);
  }
  return formations_to_create;
}

// public
function check_setup_addons(payload) {
  assert.ok(!payload.addons || typeof payload.addons === "object", "Addons was not an object of key value pairs.");
  if(!payload.addons) {
    return [];
  }
  let addon_entries = Object.keys(payload.addons)
  let addons_to_create = []
  for(let i=0; i < addon_entries.length; i++) {
    let entry = payload.addons[addon_entries[i]];
    assert.ok(entry.plan, "The addon to be created " + addon_entries[i] + " did not have a plan associated with it.");
    addons_to_create.push(entry.plan);
  }
  return addons_to_create;
}

// public
function check_setup_attachments(payload) {
  assert.ok(!payload.attachments || Array.isArray(payload.attachments), "Attachments was not an array of objects.");
  if(!payload.attachments) {
    return [];
  }
  let attachments = payload.attachments.map((x) => { return x.id; });
  assert.ok(attachments.every((x) => { return !!x; }), "One or more attachments did not contain an id.");
  return attachments;
}

// public
function check_setup_build(payload) {
  if(payload.source_blob) {
    return payload.source_blob.url;
  }
  return null
}

// public
function check_setup_drains(payload) {
  return payload['log-drains'] ? payload['log-drains'].map((x) => { return x.url; }) : [];
}

// public
function check_setup_couplings(payload) {
  return payload['pipeline-couplings'] ? payload['pipeline-couplings'] : [];
}

// public
const insert_app_setup = query.bind(query, fs.readFileSync('./sql/insert_app_setup.sql').toString('utf8'), (r) => { return r; });
const update_app_setup = query.bind(query, fs.readFileSync('./sql/update_app_setup.sql').toString('utf8'), (r) => { return r; });
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
    let setup_payload = {};
    // check/transform config vars
    setup_payload.config_vars     = check_setup_config_vars(payload);
    // check/transform features
    setup_payload.features        = check_setup_features(payload)
    // check/transform formations
    setup_payload.formations      = check_setup_formations(payload);
    // check/transform addons to create
    setup_payload.addons          = check_setup_addons(payload);
    // check/transform addon_attachments
    setup_payload.attachments     = check_setup_attachments(payload);
    // check/transform release
    setup_payload.source_blob_url = check_setup_build(payload);
    // check/transform logs
    setup_payload.drains          = check_setup_drains(payload);
    // check/transform pipelines
    setup_payload.couplings       = check_setup_couplings(payload)

    // create app
    let app_info        = await apps.create(pg_pool, payload.app.org, payload.app.space, payload.app.name)
    let app_setup_uuid  = uuid.v4();
    let app_setup       = await insert_app_setup(pg_pool, [app_setup_uuid, app_info.id]);
    let app_uuid        = app_info.id;
    let app_name        = payload.app.name;
    let space_name      = app_info.space.name;
    let space_tags      = app_info.space.compliance;
    let org             = app_info.organization.name;
    let processing      = [];

    // create config vars
    processing.push({"name":"configuration variables", "item":config_vars.update.bind(config_vars.update,
      pg_pool, 
      app_uuid, 
      app_name, 
      space_name, 
      space_tags, 
      org, 
      JSON.stringify(setup_payload.config_vars))});

    // create formation
    setup_payload.formations.forEach((form) => {
      processing.push({"name":"formation creation [" + form.type + "]", "item":formation.create.bind(formation.create,
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
        false)});
    });

    // create addons
    setup_payload.addons.forEach((plan) => {
      processing.push({"name":`Creating addon ${plan}`, "item":addons.create.bind(addons.create,
        pg_pool, 
        app_uuid, 
        app_name, 
        space_name, 
        space_tags, 
        org, 
        plan)});
    });

    // create attachments
    setup_payload.attachments.forEach((attachment) => {
      processing.push({"name":`Attaching addon ${attachment}`, "item":addon_attachments.create.bind(addon_attachments.create,
        pg_pool, 
        app_uuid, 
        app_name, 
        space_name, 
        space_tags, 
        org, 
        attachment)});
    });

    // create log drain
    setup_payload.drains.forEach((drain) => {
      processing.push({"name":`Creating log drain ${drain}`, "item":logs.create.bind(logs.create,
        pg_pool,
        app_uuid,
        app_name,
        space_name,
        drain)});
    });

    // create pipeline couplings
    setup_payload.couplings.forEach((coupling) => {
      processing.push({"name":`Adding app to pipeline ${coupling.pipeline} at stage ${coupling.stage}`, "item":pipelines.couplings.create.bind(pipelines.couplings.create,
        pg_pool,
        app_uuid,
        app_name,
        space_name,
        org,
        coupling.pipeline,
        coupling.stage)});
    });

    // set features
    setup_payload.features.forEach((feature) => {
      processing.push({"name":`Updating ${feature.name} and setting it to ${feature.enabled}`, "item":features.update.bind(features.update, 
        pg_pool, 
        app_uuid, 
        app_name, 
        space_name, 
        feature.name,
        feature.enabled)})
    });

    // create a build
    if(setup_payload.source_blob_url) {
      processing.push({"name":`Building ${setup_payload.source_blob_url}`, "item":builds.create.bind(builds.create,
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
        setup_payload.source_blob_url)});
    }

    // execute asyncronously by syncronously within the asyncronous process,
    // as if what i just said isn't going to take you 10 seconds to mull on.
    ; // this is required, if the statement above ends with a () this could accidently be executed as a deconstructor
    ((async () => {
      let errors = []
      for(let i=0; i < processing.length ; i++) {
        try {
          console.log(`app-setups (${i+1}/${processing.length}): ${processing[i].name}`)
          await processing[i].item()
        } catch (e) {
          console.log('app-setup had an error:', e)
          if(e.code && e.message) {
            errors.push(`${processing[i].name} failed [${e.code} ${e.message}]`); 
          } else {
            errors.push(`${processing[i].name} failed [${JSON.stringify(e)}`);
          }
        } finally {
          let state = 'pending'
          if(errors.length > 0) {
            state = 'failed'
          } else if (errors.length === 0 && (i + 1) === processing.length) {
            state = 'succeeded'
          }
          await update_app_setup(pg_pool, [app_setup_uuid, ((i + 1)/processing.length), errors.join(', '), state, processing[i].name])
        }
      }
    })()).catch((e) => {
      console.error("Error [app-setups]: Updating app setup and process failed:")
      console.error(e)
    })

    let app_setup_status = {
      "id":app_setup_uuid,
      "created_at":(new Date(app_setup[0].created)).toISOString(),
      "updated_at":(new Date(app_setup[0].created)).toISOString(),
      "app":{
        "id":app_uuid,
        "name":app_name
      },
      "build":{
        "id":null,
        "status":"queued",
        "output_stream_url":null
      },
      "progress":0,
      "status":app_setup[0].status,
      "failure_message":"",
      "manifest_errors":[],
      "postdeploy":null,
      "resolved_success_url":null
    }
    return app_setup_status
  } catch (e) {
    console.error("unable to process app setup:", e);
    throw new common.UnprocessibleEntityError(e.message);
  }
}

async function http_setup(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let app_setup_status = await setup(pg_pool, payload)
  return httph.created_response(res, JSON.stringify(app_setup_status));
}


module.exports = {
  create:setup,
  definition:get_app_definition,
  http:{
    create:http_setup,
    get:http_get_setup_status,
    definition:http_get_app_definition
  }
}