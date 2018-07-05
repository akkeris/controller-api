"use strict"

const config = require('./config.js');
const common = require('./common.js');
const formation = require('./formations.js');
const logs = require('./log-drains.js');
const httph = require('./http_helper.js');

// See below.
async function restart_dyno(pg_pool, app_name, space_name, type, instance, why) {
  if(why) {
    logs.event(pg_pool, app_name, space_name, 'Restarting ' + type + '.' + instance + ' (' + why + ')')
  }
  return await common.alamo.dyno.stop(pg_pool, space_name, common.alamo.app_name(app_name, type), instance)
}

// This is slightly different than restarting a dyno, as it restarts and recreates the replica set. In a rolling fashion,
// to help alleviate downtime. The restart dyno will kill it immediately and not in a friendly rolling fashion.
async function restart_dyno_type(pg_pool, app_name, space_name, type, why) {
  if(why) {
    logs.event(pg_pool, app_name, space_name, 'Restarting ' + type + ' (' + why + ')')
  }
  return await common.alamo.dyno.restart(pg_pool, space_name, common.alamo.app_name(app_name, type))
}

async function restart_app(pg_pool, app_name, space_name, why) {
  let app = await common.app_exists(pg_pool, `${app_name}-${space_name}`)
  let formations = await formation.list_types(pg_pool, app_name, space_name)
  for(let i=0; i < formations.length; i++) {
    try {
      await restart_dyno_type(pg_pool, app_name, space_name, formations[i].type, null)
    } catch (e) {
      // Do nothing, if the restart fails due to no releases and/or no formations just swallow the error.
      // console.error(`Unable to restart dyno type ${formations[i].type} ${app_name}-${space_name}: ${e}`)
    }
  }
  if(why) {
    logs.event(pg_pool, app_name, space_name, 'Restarting (' + why + ')')
  }
  return formations
}


module.exports = {
  restart_and_redeploy_app:formation.restart_and_redeploy_app,
  restart_dyno_type:restart_dyno_type,
  restart_dyno:restart_dyno,
  restart_app:restart_app
}