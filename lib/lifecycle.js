"use strict"

const assert = require('assert');
const config = require('./config.js');
const common = require('./common.js');
const logs = require('./log-drains.js');
const query = require('./query.js');
const features = require('./features.js');
const filters = require('./filters.js');
const fs = require('fs');

// public
let select_latest_image = query.bind(query, fs.readFileSync("./sql/select_latest_image.sql").toString('utf8'), (r) => { return r; });
async function restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org_name, why) {
  let formations = await common.formations_exists(pg_pool, app_uuid);
  if (why) {
    logs.event(pg_pool, app_name, space_name, 'Restarting (' + why + ')');
  }
  if (formations.length === 0) {
    // If there's no apps running, don't bother restarting.
    return;
  }  
  let space = await common.space_exists(pg_pool, space_name)
  let internal = space.tags.split(",").filter((x) => { return x.startsWith("compliance="); }).map((x) => { return x.replace("compliance=",""); }).includes("internal")
  let production = space.tags.split(",").filter((x) => { return x.startsWith("compliance="); }).map((x) => { return x.replace("compliance=",""); }).includes("prod")
  let socs = space.tags.split(",").filter((x) => { return x.startsWith("compliance="); }).map((x) => { return x.replace("compliance=",""); }).includes("socs")
  let release = {};
  try {
    release = await common.latest_release(pg_pool, app_uuid)
  } catch (e) {
    if (!(e instanceof common.NotFoundError)) {
      throw e
    }
    // If there are no releases, go ahead and abort any sort of restart.
    return;
  }
  assert.ok(release.release, 'Unable to find the latest release in order to deploy this app!.')
  let labels = {
    "akkeris.io/app-uuid":app_uuid,
    "akkeris.io/internal":internal ? "true" : "false",
    "akkeris.io/production":production ? "true" : "false",
    "akkeris.io/socs":socs ? "true" : "false",
    "akkeris.io/release-uuid":release.release,
  }
  let image = await select_latest_image(pg_pool, [app_uuid]);
  if (image.length === 0) {
    return;
  }
  image = image[0];
  image = common.registry_image(image.build_org_name, image.build_app_name, image.build_app, image.foreign_build_key, image.foreign_build_system)
  await common.alamo.config.update(pg_pool, app_name, space_name, 'RESTART', 'restart' + Math.floor(Math.random() * 10000000))
  for(let i=0; i < formations.length; i++) {
    let form = formations[i]
    await common.alamo.deploy(pg_pool, space_name, app_name, form.type, image, form.command, form.port, form.healthcheck, await features.deployment_features(pg_pool, app_uuid, form.type), labels, await filters.deployment_filters(pg_pool, app_uuid, form.type))
  }
}
// See below.
module.exports = {
  restart_and_redeploy_app,
}