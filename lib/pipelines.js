"use strict"

const assert = require('assert')
const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const httph = require('./http_helper.js');
const orgs = require('./organizations.js');
const releases = require('./releases.js');
const query = require('./query.js');
const config_var = require('./config-var.js');
const addons = require('./addons.js');

const stages = {
  "review":"development",
  "development":"staging",
  "staging":"production",
  "production":null
};

// private
function pipeline_postgres_to_response(pipeline) {
  return {
    id:pipeline.pipeline, 
    created_at:pipeline.created.toISOString(), 
    updated_at:pipeline.updated.toISOString(), 
    name:pipeline.name, 
    description:pipeline.description
  };
}

function pipeline_coupling_postgres_to_response(pipeline_coupling) {
  return {
    "app":{
      "id":pipeline_coupling.app_uuid,
      "name":pipeline_coupling.app_name + '-' + pipeline_coupling.space_name,
    },
    "id":pipeline_coupling.pipeline_coupling,
    "created_at":pipeline_coupling.created.toISOString(),
    "updated_at":pipeline_coupling.updated.toISOString(),
    "stage":pipeline_coupling.stage,
    "pipeline":{
      "id":pipeline_coupling.pipeline,
      "name":pipeline_coupling.name
    },
    "release":{
      "id":pipeline_coupling.release,
      "version":pipeline_coupling.release_version,
      "updated_at": pipeline_coupling.release_updated,
      "build":{
        "id":pipeline_coupling.release_build,
        "updated_at":pipeline_coupling.build_updated,
        "repository":{
          "url":pipeline_coupling.build_repo,
          "branch":pipeline_coupling.build_branch
        },
        "commit":{
          "sha":pipeline_coupling.build_sha,
          "message":pipeline_coupling.build_message
        },
        "author":pipeline_coupling.build_author,
      }
    }
  }
}

// TODO: Release should be the release of hte source, not destination, this must be fixed.
function pipeline_promotions_postgres_to_response(pipeline_promotions) {
  return {
    created_at:pipeline_promotions.created.toISOString(),
    id:pipeline_promotions.pipeline_promotion,
    pipeline:{
      id:pipeline_promotions.pipeline
    },
    source:{
      app:{
        id:pipeline_promotions.source_app
      },
      release:{
        id:pipeline_promotions.source_release
      }
    },
    status:"successful",
    updated_at:pipeline_promotions.updated.toISOString()
  };
}

function pipeline_promotion_targets_postgres_to_response(pipeline_promotions) {
  return {
    app:{
      id:pipeline_promotions.target_app
    },
    error_message:'',
    id:pipeline_promotions.pipeline_promotion_target,
    pipeline_promotion:{
      id:pipeline_promotions.pipeline_promotion
    },
    release:{
      id:pipeline_promotions.target_release
    },
    status:'successful'
  };
}

const select_pipeline = query.bind(query, fs.readFileSync('./sql/select_pipeline.sql').toString('utf8'), (d) => { return d; });
const insert_pipeline = query.bind(query, fs.readFileSync('./sql/insert_pipeline.sql').toString('utf8'), (d) => { return d; });
async function http_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    assert.ok(payload.name && payload.name.match(/^[a-z][a-z0-9-]{2,29}$/) !== null, 
      'The name of the pipeline must be alpha numeric and is required');
    payload.description = payload.description || '';
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let pipeline = await select_pipeline(pg_pool, [payload.name])
  if(pipeline.length !== 0) {
    throw new common.UnprocessibleEntityError('The specified pipeline already exists.');
  }
  let pipeline_uuid = uuid.v4();
  let created = new Date();
  await insert_pipeline(pg_pool, [pipeline_uuid, created, created, payload.name, payload.description])
  httph.created_response(res, JSON.stringify({
    id:pipeline_uuid, 
    created_at:created.toISOString(),
    updated_at:created.toISOString(),
    name:payload.name.toLowerCase(), 
    description:payload.description
  }))
}

async function http_get(pg_pool, req, res, regex) {
  let pipeline_key = httph.first_match(req.url, regex);
  let pipeline = await select_pipeline(pg_pool, [pipeline_key.toLowerCase()])
  if(pipeline.length === 0) {
    throw new common.NotFoundError('The specified pipeline was not found.')
  }
  return httph.ok_response(res, JSON.stringify(pipeline_postgres_to_response(pipeline[0])));
}

const list_pipelines_query = query.bind(query, fs.readFileSync('./sql/select_pipelines.sql').toString('utf8'), (d) => { return d; });
async function http_list(pg_pool, req, res, regex) {
  let data = await list_pipelines_query(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(data.map(pipeline_postgres_to_response)))
}

const delete_pipeline_query = query.bind(query, fs.readFileSync('./sql/delete_pipeline.sql').toString('utf8'), (d) => { return d; });
const delete_pipeline_couplings_by_pipeline_query = query.bind(query, fs.readFileSync('./sql/delete_pipeline_couplings_by_pipeline.sql').toString('utf8'), (d) => { return d; });
async function http_delete(pg_pool, req, res, regex) {
  let pipeline_key = httph.first_match(req.url, regex)
  let pipeline = await select_pipeline(pg_pool, [pipeline_key.toLowerCase()])
  if(pipeline.length === 0) {
    throw new common.NotFoundError('The specified pipeline was not found.')
  }
  // Remove the app couplings
  await delete_pipeline_couplings_by_pipeline_query(pg_pool, [pipeline[0].pipeline])
  // Remove the pipeline
  await delete_pipeline_query(pg_pool, [pipeline[0].pipeline])
  httph.ok_response(res, 
    JSON.stringify(pipeline_postgres_to_response(pipeline[0])))
}

const select_pipeline_coupling_by_app = query.bind(query, fs.readFileSync('./sql/select_pipeline_coupling_by_app.sql').toString('utf8'), (d) => { return d; });
async function http_get_pipeline_coupling_by_app(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let pipeline_coupling = await select_pipeline_coupling_by_app(pg_pool, [app.app_uuid])
  if(pipeline_coupling.length === 0) {
    throw new common.NotFoundError('The specified pipeline coupling was not found.')
  }
  return httph.ok_response(res, 
    JSON.stringify(pipeline_coupling_postgres_to_response(pipeline_coupling[0])));
}

const insert_pipeline_coupling = query.bind(query, fs.readFileSync('./sql/insert_pipeline_coupling.sql').toString('utf8'), (d) => { return d; });
async function create_pipeline_coupling(pg_pool, app_uuid, app_name, space_name, org_uuid, pipeline, stage) {
  try {
    assert.ok(app_uuid, 'No application was provided.');
    assert.ok(app_name, 'No application name was provided.')
    assert.ok(pipeline, 'No pipeline was provided.');
    assert.ok(typeof(pipeline) === 'string', 'The specified pipeline was not a uuid');
    pipeline = pipeline.toLowerCase();
    assert.ok(stage, 'No stage was provided.');
    assert.ok(stage === 'review' || stage === 'development' || stage === 'staging' || stage === 'production',
      'The stage property can only be one of "review", "development", "staging", or "production"');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }

  let pipeline_coupling = await select_pipeline_coupling_by_app(pg_pool, [app_uuid])
  if(pipeline_coupling.length !== 0) {
    throw new common.ConflictError("The application already is pipelined.")
  }
  let pipelines = await select_pipeline(pg_pool, [pipeline])
  if(pipelines.length === 0) {
    throw new common.NotFoundError("The specified pipeline was not found.")
  }
  let pipeline_coupling_uuid = uuid.v4()
  let created = new Date()
  await insert_pipeline_coupling(pg_pool, [pipeline_coupling_uuid, created, created, pipelines[0].pipeline, app_uuid, stage])
  return {
    app:{
      id:app_uuid,
      name:`${app_name}-${space_name}`,
    },
    id:pipeline_coupling_uuid,
    created_at:created.toISOString(),
    updated_at:created.toISOString(),
    stage,
    pipeline:{
      id:pipelines[0].pipeline,
      name:pipelines[0].name
    }
  }
}

async function http_create_pipeline_coupling(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let app = await common.app_exists(pg_pool, payload.app)
  let pipeline_coupling = await create_pipeline_coupling(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_uuid, payload.pipeline, payload.stage)
  return httph.created_response(res,
    JSON.stringify(pipeline_coupling))  
}

const get_pipeline_coupling_query = query.bind(query, fs.readFileSync('./sql/select_pipeline_coupling.sql').toString('utf8'), (d) => { return d; });
async function http_get_pipeline_coupling(pg_pool, req, res, regex) {
  let pipeline_coupling_uuid = httph.first_match(req.url, regex)
  let pipeline_coupling = await get_pipeline_coupling_query(pg_pool, [pipeline_coupling_uuid])
  if(pipeline_coupling.length === 0) {
    throw new common.NotFoundError('The specified pipeline coupling was not found.')
  }
  return httph.ok_response(res,
    JSON.stringify(pipeline_coupling_postgres_to_response(pipeline_coupling[0])))
}

const list_pipeline_couplings_query = query.bind(query, fs.readFileSync('./sql/select_pipeline_couplings.sql').toString('utf8'), (d) => { return d; })
async function http_list_pipeline_couplings(pg_pool, req, res, regex) {
  let pipeline_couplings = await list_pipeline_couplings_query(pg_pool, [])
  httph.ok_response(res,
    JSON.stringify(pipeline_couplings.map(pipeline_coupling_postgres_to_response)))
}

const list_pipeline_couplings_by_pipeline_query = query.bind(query, fs.readFileSync('./sql/select_pipeline_couplings_by_pipeline.sql').toString('utf8'), (d) => { return d; });
async function http_list_pipeline_couplings_by_pipeline(pg_pool, req, res, regex) {
  let pipeline_key = httph.first_match(req.url, regex);

  let pipeline = await select_pipeline(pg_pool, [pipeline_key.toLowerCase()])
  if(pipeline.length === 0) {
    throw new common.NotFoundError('The specified pipeline was not found.')
  }

  let pipeline_couplings = await list_pipeline_couplings_by_pipeline_query(pg_pool, [pipeline[0].pipeline])
  return httph.ok_response(res,
    JSON.stringify(pipeline_couplings.map(pipeline_coupling_postgres_to_response)))
}

const delete_pipeline_coupling_query = query.bind(query, fs.readFileSync('./sql/delete_pipeline_coupling.sql').toString('utf8'), (d) => { return d; })
async function http_delete_pipeline_coupling(pg_pool, req, res, regex) {
  let pipeline_coupling_uuid = httph.first_match(req.url, regex);
  let pipeline_coupling = await get_pipeline_coupling_query(pg_pool, [pipeline_coupling_uuid])
  if(pipeline_coupling.length === 0) {
    throw new common.NotFoundError('The specified pipeline coupling was not found.')
  }
  await delete_pipeline_coupling_query(pg_pool, [pipeline_coupling[0].pipeline_coupling])
  return httph.ok_response(res,
    JSON.stringify(pipeline_postgres_to_response(pipeline_coupling[0])))
}

async function get_promotion_warnings(pg_pool, app_src, app_dst) {
  let warnings = [];
  let src_config = await config_var.get(pg_pool, app_src.name, app_src.space, app_src.app)
  let dst_config = await config_var.get(pg_pool, app_dst.name, app_dst.space, app_dst.app)
  let src_keys = Object.keys(src_config);
  let dst_keys = Object.keys(dst_config);

  let warnings_config_source = [];
  for (let i = 0; i < src_keys.length; i++){
    let key = src_keys[i];
    if (!dst_config.hasOwnProperty(key)) {
      warnings_config_source.push(key);
    }
  }
  let warnings_config_dest = [];
  for (let i = 0; i < dst_keys.length; i++){
    let key = dst_keys[i];
    if (!src_config.hasOwnProperty(key)) {
      warnings_config_dest.push(key);
    }
  }
  if(warnings_config_source.length > 0) {
    warnings.push(`  The source app contains config var(s) (${warnings_config_source.join(', ')}) that are not present in the destination app (${app_dst.name}-${app_dst.space}).`)
  }
  if(warnings_config_dest.length > 0) {
    warnings.push(`  The destination app (${app_dst.name}-${app_dst.space}) contains config var(s) (${warnings_config_dest.join(', ')}) that is not present in the source app.`)
  }

  let src_addons = await addons.list(pg_pool, app_src.app, app_src.name, app_src.space, app_src.org);
  let dst_addons = await addons.list(pg_pool, app_dst.app, app_dst.name, app_dst.space, app_dst.org);

  let warnings_addon_source = [];
  for (let i=0; i < src_addons.length; i++) {
    let found = false;
    for (let j=0; j < dst_addons.length; j++) {
      if(src_addons[i].addon_service.id === dst_addons[j].addon_service.id) {
        found = true;
      }
    }
    if(!found) {
      warnings_addon_source.push(src_addons[i]);
    }
  }
  let warnings_addon_dest = [];
  for (let i=0; i < dst_addons.length; i++) {
    let found = false;
    for (let j=0; j < src_addons.length; j++) {
      if(dst_addons[i].addon_service.id === src_addons[j].addon_service.id) {
        found = true;
      }
    }
    if(!found) {
      warnings_addon_dest.push(dst_addons[i]);
    }
  }
  if(warnings_addon_source.length > 0) {
    warnings.push(`  The source app has addon(s) (${warnings_addon_source.map((x) => x.addon_service.name).join(', ')}) that are not on the destination app (${app_dst.name}-${app_dst.space})`);
  }

  if(warnings_addon_dest.length > 0) {
    warnings.push(`  The destination app has addon(s) (${warnings_addon_dest.map((x) => x.addon_service.name).join(', ')}) that are not on the source app (${app_dst.name}-${app_dst.space})`);
  }

  return warnings
}

const create_pipeline_promotion_query = query.bind(query, fs.readFileSync('./sql/insert_pipeline_promotion.sql').toString('utf8'), (d) => { return d; });
const get_pipeline_couplings_by_stage = query.bind(query, fs.readFileSync('./sql/select_pipeline_couplings_by_stage.sql').toString('utf8'), (d) => { return d; });
const create_pipeline_promotion_target_query = query.bind(query, fs.readFileSync('./sql/insert_pipeline_promotion_target.sql').toString('utf8'), (d) => { return d; });
async function http_create_pipeline_promotion(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    assert.ok(payload.pipeline, 'The request did not include a "pipeline" to promote.')
    assert.ok(payload.source, 'The request did not include a "source" app to promote.')
    assert.ok(payload.source.app, 'The request did not include a "source/app" id or name to promote.')
    assert.ok(payload.source.app.id, 'The request did not include a "source/app/id" to promote.')
    assert.ok(payload.targets, 'The request did not include a "target" array of targets to promote to.')
    assert.ok(Array.isArray(payload.targets), 'The requested target field of apps to deploy to was not an array.')
    assert.ok(payload.targets.every((target) => { return target.app.id ? true : false; }), 
      'A specified target for deployment did not contain an app id, e.g., #/targets/[]/app/id did not exist.')
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let app = await common.app_exists(pg_pool, payload.source.app.id)
  // Pull the pipeline and couplings to ensure the targets are in the next "stage", 
  // if one of the stages does not match the stage of the source app in the couplings, 
  // do not create the promotion. 
  let pipeline_coupling = await select_pipeline_coupling_by_app(pg_pool, [app.app_uuid])
  try {
    assert.ok(stages[pipeline_coupling[0].stage], 'The specified app cannot be promoted as it has no next stage.')
    assert.ok(pipeline_coupling[0].pipeline === payload.pipeline.id || pipeline_coupling[0].name === payload.pipeline.name.toLowerCase(), 'The specified app is not in the given pipeline.')
  } catch(e) {
    throw new common.UnprocessibleEntityError(e.message)
  }

  // selects the target apps allowed based on the pipeline, what apps are coupled to it, and the next stage in the pipeline.
  let pipeline_couplings = await get_pipeline_couplings_by_stage(pg_pool, [payload.pipeline.id, stages[pipeline_coupling[0].stage]])
  // ensure all the apps in the payload.target are in the list of apps that are coupled and in the next stage of the source app.
  let targets = pipeline_couplings.filter((pc) => { 
    return payload.targets.some((target) => { return pc.app_uuid === target.app.id; })
  });
  if(targets.length !== payload.targets.length) {
    throw new common.UnprocessibleEntityError('Some of the specified targets are either not in the pipeline or cannot be promoted from the specified source app.')
  }
  let latest_release = null
  if(payload.source.app.release && payload.source.app.release.id) {
    latest_release = await releases.get(pg_pool, payload.source.app.id, payload.source.app.release.id)
  } else {
    latest_release = await releases.latest_release(pg_pool, app.app_uuid)
  }
  if(latest_release.app !== payload.source.app.id) {
    throw new common.UnprocessibleEntityError('The specified release was not part of the source app. [' + latest_release.app + '!=' + payload.source.app.id + ']')
  }

  if (payload.safe) {
    for(let i=0; i < targets.length; i++) {
      let target = targets[i]
      let app_src = {app:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_uuid};
      let app_dst = {app:target.app_uuid, name:target.app_name, space:target.space_name, org:target.org};
      let warnings = await get_promotion_warnings(pg_pool, app_src, app_dst)
      if (warnings && warnings.length > 0) {
        throw new common.UnprocessibleEntityError(`Safe promotion was specified and this promotion has been deemed unsafe. Reasons:\n${warnings.join("\n")}`);
      }
    }
  }

  //  Insert a new pipeline_promotions entry
  let pipeline_promotion_uuid = uuid.v4();
  let created = new Date();
  await create_pipeline_promotion_query(pg_pool, [pipeline_promotion_uuid, created, created, pipeline_coupling[0].pipeline, latest_release.release, 'Promotion of ' + app.app_name + '-' + app.space_name, 'aka'])
  // Create a new release for each of the apps with the build id from the source app id
  for(let i=0; i < targets.length; i++) {
    let target = targets[i]
    let app_src = {app:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_uuid};
    let app_dst = {app:target.app_uuid, name:target.app_name, space:target.space_name, org:target.org};
    let release = await releases.create_release(pg_pool, app_src, app_dst, latest_release.build, 'Promotion from ' + app.app_name + '-' + app.space_name, 'promotion', 'Promotion from ' + app.app_uuid + ' of ' + latest_release.build, 'aka')
    let created = new Date();
    let pipeline_promotion_target_id = uuid.v4();
    create_pipeline_promotion_target_query(pg_pool, [pipeline_promotion_target_id, created, created, pipeline_promotion_uuid, release.id, app_dst.app]).catch((err) => {
      console.warn('An error occured trying to create a pipeline promotion target:', err)
    });
  }

  return httph.created_response(res, JSON.stringify({
    created_at:created.toISOString(),
    updated_at:created.toISOString(),
    pipeline:{ id:pipeline_coupling[0].pipeline, name:pipeline_coupling[0].name },
    source:{
      app:{
        id:app.app_uuid,
        name:app.app_name
      },
      space:{
        name:app.space_name
      },
      release:{
        id:latest_release.release
      }
    },
    id:pipeline_promotion_uuid,
    status:"successful"
  }));
}

const list_pipeline_promotion_query = query.bind(query, fs.readFileSync('./sql/select_pipeline_promotions.sql').toString('utf8'), (d) => { return d; })
async function http_list_pipeline_promotions(pg_pool, req, res, regex) {
  let pipeline_promotions = await list_pipeline_promotion_query(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(pipeline_promotions.map(pipeline_promotions_postgres_to_response)))
}

const get_pipeline_promotion_query = query.bind(query, fs.readFileSync('./sql/select_pipeline_promotion.sql').toString('utf8'), (d) => { return d; })
async function http_get_pipeline_promotion(pg_pool, req, res, regex) {
  let pipeline_promotion_uuid = httph.first_match(req.url, regex)
  let pipeline_promotion = await get_pipeline_promotion_query(pg_pool, [pipeline_promotion_uuid])
  if(pipeline_promotion.length === 0) {
    throw new common.NotFoundError('The specified pipeline promotion was not found.')
  }
  return httph.ok_response(res, JSON.stringify(pipeline_promotions_postgres_to_response(pipeline_promotion[0])))
}

async function http_get_pipeline_promotion_target(pg_pool, req, res, regex) {
  let pipeline_promotion = await list_pipeline_promotion_query(pg_pool, [])
  return httph.ok_response(res, JSON.stringify(pipeline_promotion.map(pipeline_promotion_targets_postgres_to_response)))
}

function http_pipeline_stages(pg_pool, req, res, regex) {
  return httph.ok_response(res, JSON.stringify(stages));
}

module.exports = {
  stages:{
    http:{
      get:http_pipeline_stages
    }
  },
  http:{
    create:http_create,
    get:http_get,
    list:http_list,
    delete:http_delete,
    list_promotion_target:http_get_pipeline_promotion_target
  },
  couplings:{
    http:{
      create:http_create_pipeline_coupling,
      get:http_get_pipeline_coupling,
      list:http_list_pipeline_couplings,
      list_by_pipeline:http_list_pipeline_couplings_by_pipeline,
      delete:http_delete_pipeline_coupling,
      get_by_app:http_get_pipeline_coupling_by_app
    },
    list_by_app:select_pipeline_coupling_by_app,
    create:create_pipeline_coupling,
  },
  promotions:{
    http:{
      create:http_create_pipeline_promotion,
      list:http_list_pipeline_promotions,
      get:http_get_pipeline_promotion
    }
  }
}