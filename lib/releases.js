"use strict"

const assert = require('assert')
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const builds = require('./builds.js');
const config = require('./config.js');
const common = require('./common.js');
const logs = require('./log-drains.js');
const httph = require('./http_helper.js');
const formation = require('./formations.js');
const query = require('./query.js');
const spaces = require('./spaces.js');

// private
async function request_release(pg_pool, app_dest, image, release_id) {
  let formations = await common.formations_exists(pg_pool, app_dest.app)
  if(formations.length === 0) {
    assert.ok(app_dest.app, 'No uuid found on destination app.');
    assert.ok(app_dest.name, 'No name found on destination app.');
    assert.ok(app_dest.space, 'No space found on destination app.');
    // there is no record for a formation, we'll create a default web formation.
    try {
      await formation.create(pg_pool, app_dest.app, app_dest.name, app_dest.space, app_dest.space_tags, app_dest.org_name, 'web', config.dyno_default_size, 1, null, config.default_port, null, false)
    } catch (e) {
      // If two releases come in at the same time a race condition could occur where one creates the web dyno 
      // and the other sees the formations as empty because of the difference in time it takes to record the record. 
      // this is typically common if multiple builds are submitted at once (e.g., someone is rapidly commiting to master...)

      // TODO: we could use a db transaction between when we pull the formations and when we decide to create (or not) the
      // formation (between line 40 (common.formations_exists) adn line 47 (formation.create) above..., or ...
      
      // TODO: We could create a common process for submitting releases into a queue and only allow one release per app
      // at a time (also, in the order they were requested and once it's in pending move on to the next release for the app). 
      // Releases at the moment could be out of order if they come in rapidly, this at least swallows the error if it tries
      // to accidnetly create a dyno.
      if(!(e instanceof common.ConflictError)) {
        throw e
      }
    }
    let new_formations = await common.formations_exists(pg_pool, app_dest.app)
    if(new_formations.length === 0) {
      console.log('unable to pull formations', new_formations.length);
      throw new common.InternalServerError()
    }
    formations = new_formations;
  }
  let space = await common.space_exists(pg_pool, app_dest.space_uuid || app_dest.space)
  let internal = space.tags.split(",").filter((x) => { return x.startsWith("compliance="); }).map((x) => { return x.replace("compliance=",""); }).includes("internal")
  let production = space.tags.split(",").filter((x) => { return x.startsWith("compliance="); }).map((x) => { return x.replace("compliance=",""); }).includes("prod")
  let socs = space.tags.split(",").filter((x) => { return x.startsWith("compliance="); }).map((x) => { return x.replace("compliance=",""); }).includes("socs")
  let labels = {
    "akkeris.io/app-uuid":app_dest.app,
    "akkeris.io/internal":internal ? "true" : "false",
    "akkeris.io/production":production ? "true" : "false",
    "akkeris.io/socs":socs ? "true" : "false",
    "akkeris.io/release-uuid":release_id,
  }
  let results = []
  for (let i=0 ; i < formations.length; i++) {
    let form = formations[i]
    results.push(await common.alamo.deploy(pg_pool, app_dest.space, app_dest.name, form.type, image, form.command, form.port, form.healthcheck, await common.deployment_features(pg_pool, app_dest.app, form.type), labels, await common.deployment_filters(pg_pool, app_dest.app, form.type)))
  }
  return results;
}

// private
const create_release_record = query.bind(query, fs.readFileSync("./sql/insert_release.sql").toString('utf8'), null)
const query_releases_by_app = query.bind(query, fs.readFileSync("./sql/select_releases.sql").toString('utf8'), null)
const select_release = query.bind(query, fs.readFileSync("./sql/select_release.sql").toString('utf8'), null)
const get_next_release_version = query.bind(query, fs.readFileSync("./sql/select_next_release.sql").toString('utf8'), (r) => { return r.next_version; });
async function latest_release(pg_pool, app_uuid) {
  return await common.latest_release(pg_pool, app_uuid);
}

async function list(pg_pool, app_uuid) {
  return await query_releases_by_app(pg_pool, [app_uuid]);
}


// private
function release_obj_to_postgres(release) {
  assert.ok(release.build, 'A build is required for each release, none was specified.');
  assert.ok(release.id, 'A release id is required for a release record, none was specified.');
  assert.ok(release.app, 'An app id is required for a release record, none was specified.');
  return [release.id, release.app, release.created, release.updated, release.build, release.logs, release.app_logs, release.status, release.user_agent, release.description, release.trigger, release.trigger_notes, release.version, false];
}

// private
function release_obj_to_response(release) {
  return {
    app:{
      id:release.app,
      name:release.app_name + '-' + release.space_name
    },
    created_at:release.created.toISOString(),
    description:release.description,
    slug:{
      id:release.build
    },
    id:release.id || release.release,
    status:release.status || "succeeded",
    user:{
      id:uuid.unparse(crypto.createHash('sha256').update(release.org).digest(), 16),
      email:""
    },
    version:release.version,
    current:release.current
  };
}

// public
async function create_release(pg_pool, app_src, app_dest, build_uuid, description, trigger, trigger_notes, agent, user) {
  // CAUTION: Do not check for pipeline limitations here, its used by pipelines.
  let version = await get_next_release_version(pg_pool, [app_dest.app])
  version = version[0]
  let build = await builds.succeeded(pg_pool, build_uuid)
  if(!build) {
    throw new common.ConflictError(`The build id ${build_uuid} does not exist or is still in process of building`)
  }
  let release_id = uuid.v4();
  let release = {
    id:release_id,
    app:app_dest.app,
    app_name:app_dest.name,
    space_name:app_dest.space,
    org:app_dest.org,
    build:build_uuid,
    logs:'',
    app_logs:'',
    status:'queued',
    user_agent:agent,
    description,
    trigger,
    trigger_notes,
    version,
    current:true
  }
  release.updated = release.created = new Date();
  await create_release_record(pg_pool, release_obj_to_postgres(release))
  try {
    await request_release(pg_pool, app_dest, build.docker_registry_url, release_id);
    await common.update_release_status(pg_pool, app_dest.app, release_id, 'pending');
    setTimeout(async () => {
      try {
        let release_update = await common.release_exists(pg_pool, app_dest.app, release_id);
        if (release_update.status === 'pending') {
          await common.update_release_status(pg_pool, app_dest.app, release_id, 'unknown');
        }
      } catch (e) {
        // If the release doesn't exist its possible the app was removed before the release
        // timed out, this happens commonly in the tests, rare outside of that.
        if(!(e instanceof common.NotFoundError)) {
          console.error("Error updating release status while checking timeout: ", e, release)
        }
      }
    }, 10 * 60 * 1000);
  } catch (e) {
    await common.update_release_status(pg_pool, app_dest.app, release_id, 'failed');
    console.error("Error recording and requesting release:", e, release);
    throw e
  }
  let release_event = {
    'action':'release',
    'app':{
      'name':app_dest.name,
      'id':app_dest.app,
    },
    'space':{
      'name':app_dest.space,
    },
    'release':{
      'id':release.id,
      'result':'succeeded',
      'created_at':release.created.toISOString(),
      version,
      description,
    },
    'build':{
      'id':build.id,
      'result':'succeeded',
      'repo':build.repo,
      'commit':build.sha,
      'branch':build.branch,
    }
  }
  logs.event(pg_pool, app_dest.name, app_dest.space, "Release v" + version + " created (" + description + ")");
  common.lifecycle.emit('release', release_event)
  common.notify_hooks(pg_pool, app_dest.app, 'release', JSON.stringify(release_event), user ? user : "System")
  return release_obj_to_response(release)
}

async function create(pg_pool, app_uuid, app_name, space_name, space_tags, org, description, slug, release_id, trigger_notes, user) {
  if(!slug && !release_id) {
    throw new common.UnprocessibleEntityError(`The specified "slug" (or) "release" field was not provided.`)
  }
  if(slug && release_id) {
    throw new common.UnprocessibleEntityError(`The specified request may only contain either a "slug" field for the build to deploy or the "release" field for the release to roll back to, not both.`)
  }
  if(slug === 'latest') {
    let build = await builds.latest_build(pg_pool, app_uuid)
    if(!build || build.status !== 'succeeded') {
      throw new common.UnprocessibleEntityError(`A release cannot be created on this as the build has not yet completed, does not exist or was not successful.`)
    }
    slug = build.build
  }

  let target_app = {app:app_uuid, name:app_name, space:space_name, org, space_tags}
  let desc_build = 'new_build'
  if(slug) {
    common.check_uuid(slug)
    description = description || 'Deploy of ' + slug
  } else {
    let release = await common.release_exists(pg_pool, app_uuid, release_id)
    slug = release.build
    description = 'Rollback to ' + release.id
    desc_build = 'rollback'
  }
  return await create_release(pg_pool, target_app, target_app, slug, description, desc_build, trigger_notes || '', 'aka', user);
}


// private
const pull_auto_releases = query.bind(query, fs.readFileSync("./sql/select_auto_releases.sql").toString('utf8'), (r) => { return r; });
async function auto_releases(pg_pool) {
  try {
    let auto = await pull_auto_releases(pg_pool, [])
    await Promise.all(auto.map(async (auto_release) => {
      try {
        // Check to make sure app still exists. 
        await common.app_exists(pg_pool, auto_release.app)
        let desc = `Auto-Deploy ${auto_release.build.split('-')[0]}`
        await create(pg_pool, auto_release.app, auto_release.app_name, auto_release.space_name, auto_release.space_tags, auto_release.org, desc, auto_release.build, null, desc)
      } catch (err) {
        console.error("Unable to kick off new auto-release:", err)
      }
    }))
  } catch (err) {
    console.error("Cannot pull auto releases: ", err)
  } finally {
    setTimeout(() => { auto_releases(pg_pool).catch((e) => { console.error(e) }) }, 15000);
  }
}

// public
async function http_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_uuid)
  let data = await httph.buffer_json(req)
  // Note: It's important to point out these checks are done further up the chain here
  // rather than in create or create_release as the create/create_release are used in other
  // processes such as pipelines which need to release a slug or image on an app that it did
  // not originate on.  So don't move these downstream.
  if(data.slug) {
    let build = await builds.succeeded(pg_pool, data.slug)
    if(!build || build.app !== app.app_uuid) {
      throw new common.ConflictError(`The slug ${data.slug} does not exist or is still in process of building`)
    }
  }
  return httph.created_response(res, 
    JSON.stringify(await create(pg_pool, app.app_uuid, app.app_name, app.space_name, space.tags, app.org_uuid, data.description, data.slug, data.release, data.trigger_notes, req.headers['x-username'])))
}

// public
async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_uuid)
  let releases = await list(pg_pool, app.app_uuid)
  return httph.ok_response(res, JSON.stringify(releases.map(release_obj_to_response)))
}

// public
async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let release_id = httph.second_match(req.url, regex)
  common.check_uuid(release_id)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_uuid)
  let release = await common.release_exists(pg_pool, app.app_uuid, release_id)
  return httph.ok_response(res, JSON.stringify(release_obj_to_response(release)));
}

const select_release_status = query.bind(query, fs.readFileSync("./sql/select_release_status.sql").toString('utf8'), null);
const select_release_statuses = query.bind(query, fs.readFileSync("./sql/select_release_statuses.sql").toString('utf8'), null);
const insert_release_statuses = query.bind(query, fs.readFileSync("./sql/insert_release_statuses.sql").toString('utf8'), null);
const update_release_statuses = query.bind(query, fs.readFileSync("./sql/update_release_statuses.sql").toString('utf8'), null);

// public
async function http_get_release_status(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let release_id = httph.second_match(req.url, regex);
  let release_status_key = httph.third_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  common.check_uuid(release_id);
  let release = await common.release_exists(pg_pool, app.app_uuid, release_id);
  let status = await select_release_status(pg_pool, [release_status_key, release_id]);
  if(status.length === 0) {
    throw new common.NotFoundError('The specified release status was not found.');
  }
  return httph.ok_response(res, JSON.stringify({
    "id":status[0].release_status,
    "state":status[0].state,
    "name":status[0].name,
    "context":status[0].context,
    "description":status[0].description,
    "target_url":status[0].target_url,
    "image_url":status[0].image_url,
    "created_at":status[0].created,
    "release":release_obj_to_response(release),
    "updated_at":status[0].updated
  }));
}

// public
async function http_list_release_statuses(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let release_id = httph.second_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  common.check_uuid(release_id);
  let release = await common.release_exists(pg_pool, app.app_uuid, release_id);
  let statuses = await select_release_statuses(pg_pool, [release_id]);
  let combined_state = statuses.reduce(((acc, status)=> {
    if(acc === "error" || acc === "failure" || acc === "pending") {
      return acc;
    }
    return status.state;
  }), "success");
  return httph.ok_response(res, JSON.stringify({
    "state":combined_state,
    "release":release_obj_to_response(release),
    "statuses":statuses.map((status) => {
      return {
        "id":status.release_status,
        "state":status.state,
        "name":status.name,
        "context":status.context,
        "description":status.description,
        "target_url":status.target_url,
        "image_url":status.image_url,
        "created_at":status.created,
        "updated_at":status.updated
      }
    })
  }));
}

async function http_create_release_status(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let release_id = httph.second_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let payload = await httph.buffer_json(req);
  common.check_uuid(release_id);
  let release = await common.release_exists(pg_pool, app.app_uuid, release_id);
  try {
    assert.ok(payload.context && (/^[\.\/\\\+\-A-Za-z0-9]+$/g).test(payload.context), 'Invalid context name: The context name must be alpha numeric and can contain the characters /\\+-.');
    assert.ok(payload.context && payload.context.length > 5, 'Invalid context length: The context length must be more than 5 characters');
    assert.ok(payload.context && payload.context.length < 32, 'Invalid context length: The context length cannot be more than 32 characters.');
    assert.ok(payload.name.length  > 3, 'Invalid name: The status name must be more than 3 characters.');
    assert.ok(payload.name.length  < 256, 'Invalid name: The status name cannot be longer than 256 characters.');
    assert.ok(!payload.image_url || payload.image_url.length  < 256, 'Invalid image_url: The image_url cannot be longer than 256 characters.');
    assert.ok(!payload.target_url || payload.target_url.length  < 256, 'Invalid image_url: The image_url cannot be longer than 256 characters.');
    assert.ok(!payload.image_url || payload.image_url.startsWith("https://") || payload.image_url.startsWith("http://"), 'Invalid image url: The image_url must begin with https://');
    assert.ok(!payload.target_url || payload.target_url.startsWith("https://") || payload.target_url.startsWith("http://"), 'Invalid target url: The target_url must begin with https://');
    assert.ok(!payload.description || payload.description.length < 1024, 'The payload description length may not be more than 1024 characters.');
    assert.ok(payload.state === 'error' || payload.state === 'failure' || payload.state === 'pending' || payload.state === 'success', 'Invalid state: The state must be "error", "failure", "pending" or "success".');
    assert.ok(release.id, 'The release id was not defined.');
    let existing_status = await select_release_status(pg_pool, [payload.context, release_id]);
    assert.ok(existing_status.length === 0, 'This status already exists for this release, use update not create.');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  let release_status_id = uuid.v4();
  let created_updated_at = new Date();
  await insert_release_statuses(pg_pool, [release_status_id, release.id, payload.state, payload.name, payload.context, payload.description || '', payload.target_url || '', payload.image_url || '', created_updated_at, created_updated_at]);
  return httph.created_response(res, JSON.stringify({
    "id":release_status_id,
    "state":payload.state,
    "name":payload.name,
    "context":payload.context,
    "description":payload.description || '',
    "target_url":payload.target_url || '',
    "image_url":payload.image_url || '',
    "created_at":created_updated_at,
    "release":release_obj_to_response(release),
    "updated_at":created_updated_at
  }));
}

// public
async function http_update_release_status(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let release_id = httph.second_match(req.url, regex);
  let release_status_id = httph.third_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let payload = await httph.buffer_json(req);
  common.check_uuid(release_id);
  let release = await common.release_exists(pg_pool, app.app_uuid, release_id);
  let existing_status = await select_release_status(pg_pool, [release_status_id, release_id]);
  try {
    assert.ok(!payload.context, 'Invalid parameter: the context of the status may not be renamed or changed.')
    assert.ok(!payload.name || payload.name.length > 3, 'Invalid name: The status name must be more than 3 characters.');
    assert.ok(!payload.name || payload.name.length < 256, 'Invalid name: The status name cannot be longer than 256 characters.');
    assert.ok(!payload.image_url || payload.image_url.length < 256, 'Invalid image_url: The image_url cannot be longer than 256 characters.');
    assert.ok(!payload.target_url || payload.target_url.length < 256, 'Invalid image_url: The image_url cannot be longer than 256 characters.');
    assert.ok(!payload.image_url || payload.image_url.startsWith("https://") || payload.image_url.startsWith("http://"), 'Invalid image url: The image_url must begin with https://');
    assert.ok(!payload.target_url || payload.target_url.startsWith("https://") || payload.target_url.startsWith("http://"), 'Invalid target url: The target_url must begin with https://');
    assert.ok(!payload.description || payload.description.length < 1024, 'The payload description length may not be more than 1024 characters.');
    assert.ok(payload.state === 'error' || payload.state === 'failure' || payload.state === 'pending' || payload.state === 'success', 'Invalid state: The state must be "error", "failure", "pending" or "success".');
    assert.ok(existing_status.length === 1, 'This status does not exist, use create not update.');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }
  await update_release_statuses(pg_pool, [release_status_id, release.id, payload.name, payload.image_url, payload.target_url, payload.description, payload.state]);
  return httph.ok_response(res, JSON.stringify({
    "id":release_status_id,
    "state":payload.state || existing_status[0].state,
    "name":payload.name || existing_status[0].name,
    "context": existing_status[0].context,
    "description":payload.description || existing_status[0].description,
    "target_url":payload.target_url || existing_status[0].target_url,
    "image_url":payload.image_url || existing_status[0].image_url,
    "created_at":existing_status[0].created,
    "release":release_obj_to_response(release),
    "updated_at":new Date()
  }));
}

module.exports = {
  http:{
    create:http_create,
    get:http_get,
    list:http_list,
    status:{
      list:http_list_release_statuses,
      get:http_get_release_status,
      create:http_create_release_status,
      update:http_update_release_status,
    }
  },
  create,
  list,
  create_release,
  latest_release,
  timers:{
    begin:auto_releases
  },
};