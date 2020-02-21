"use strict"

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const config = require('./config.js');
const common = require('./common.js');
const logs = require('./log-drains.js');
const lifecycle = require('./lifecycle.js');
const releases = require('./releases.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

let select_formation = query.bind(query, fs.readFileSync("./sql/select_formation.sql").toString('utf8'), (x) => { return x });

const execute_whitelist = [
  /^kill \-[0-9]+ \-1$/,
];

/**
 * If you're looking for creating dynos, updating, or deleting dynos see formations.js, 
 * dynos are representitive of the instance of a formation, not the actual definition
 * itself.  Confused? I know, its the parody between what "what I want to happen" and
 * "what happened".   Happy Hacking.
 */


// private
function instances_to_payload(app_uuid, app_name, space_name, org, pods, release) {
  return pods.map((pod) => {
    let name = pod.instanceid.replace(app_name + '-', '').replace(space_name + '-', '').replace(/\-\-/g, '-').replace('-' + pod.formation.type + '-', '');
    let stats = (
                  pod.status ? 
                  (pod.status.filter((x) => x.output.indexOf(name) > -1)[0]) : 
                  {ready:false, restarted:0}
                ) || {ready:false, restarted:0}

    let ready = stats.ready
    let restarts = stats.restarted
    let status = pod.phase.split('/')[0].toLowerCase()
    let additional_info = (stats.state && stats.state.waiting && stats.state.waiting.message) ? stats.state.waiting.message : pod.reason

    if(stats.state && stats.state.terminated) {
      status = 'stopping'
    } else if(pod.reason && pod.reason !== "" && pod.reason.toLowerCase().indexOf('failed to start') > -1) {
      status = 'start-failure'
    } else if(pod.reason && pod.reason !== "" && pod.reason.toLowerCase().indexOf('crashloopbackoff') > -1) {
      status = 'app-crashed'
    } else if(status === 'running' && !ready && restarts === 0 && pod.formation.type === 'web') {
      status = 'probe-failure'
    }
    return {
      "attach_url":"",
      "command":pod.formation.command,
      "created_at":pod.starttime,
      "id":uuid.unparse(crypto.createHash('sha256').update(pod.instanceid).digest(), 16),
      name,
      "release":{
        "id":release.release,
        "version":release.version,
      },
      "app":{
        "name":app_name + '-' + space_name,
        "id":app_uuid
      },
      "size":pod.formation.size,
      "state":status,
      ready,
      restarts,
      "type":pod.formation.type,
      "updated_at":pod.appstatus && pod.appstatus[0] ? pod.appstatus[0].startedat : pod.starttime,
      additional_info,
    }
  });
}

// private
// dyno_id is expected to be [type].[instance-id] where instance id is 
// the value returned from /v1/space/:space/app/:app/instance without the alamo
// app name prefix (and forward dash).  E.g., web.23452345-3452 or worker.2343244-2222
async function dyno_stop(pg_pool, app_uuid, app_name, space_name, dyno_id, why) {
  if(dyno_id.indexOf('.') === -1) {
    throw new common.NotFoundError('The specified dyno id was not found.')
  }
  let type = dyno_id.substring(0, dyno_id.indexOf('.'));
  let formation = await select_formation(pg_pool, [app_uuid, type])
  if(formation.length === 0) {
    throw new common.NotFoundError(`The dyno type ${type} was not found.`);
  }
  let alamo_appname = common.alamo.app_name(app_name, type);
  dyno_id = dyno_id.replace(/^[A-z]+\./, '')
  let resp = await common.alamo.dyno.stop(pg_pool, space_name, alamo_appname, dyno_id)
  if(why) {
    logs.event(pg_pool, app_name, space_name, 'Restarting ' + type + '.' + dyno_id + ' (' + why + ')')
  }
  return resp;
}

// private
async function dyno_stop_type(pg_pool, app_uuid, app_name, space_name, type, why) {
  assert.ok(type.indexOf('.') === -1, 'The specified dyno type was actually a dyno instance.')
  let formation = await select_formation(pg_pool, [app_uuid, type])
  if(formation.length === 0) {
    throw new common.NotFoundError(`The dyno type ${type} was not found.`);
  }
  await common.alamo.dyno.restart(pg_pool, space_name, common.alamo.app_name(app_name, formation[0].type))
  if(why) {
    logs.event(pg_pool, app_name, space_name, 'Restarting ' + formation[0].type + ' (' + why + ')')
  }
}


// private
async function dyno_info(pg_pool, app_uuid, app_name, space_name) {
  let forms = await common.formations_exists(pg_pool, app_uuid)
  return (await Promise.all(forms.map(async (x) => {
    return await Promise.all([
      common.alamo.dyno.info(pg_pool, space_name, common.alamo.app_name(app_name, x.type)),
      common.alamo.dyno.status(pg_pool, space_name, common.alamo.app_name(app_name, x.type)),
      x
    ])
  }))).map((x) => {
    return x[0] ? x[0].map((y) => Object.assign(y, {"formation":x[2], "status":x[1]})) : []
  }).reduce((x, y) => x.concat(y), [])
}


// public
async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let release = {release:null, version:null}
  try {
    release = await common.latest_release(pg_pool, app.app_uuid)
  } catch (e) {
  }
  let info = await dyno_info(pg_pool, app.app_uuid, app.app_name, app.space_name)
  return httph.ok_response(res, JSON.stringify(instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, info, release)));
}

// public
async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let dyno_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let release = null
  try {
    release = await common.latest_release(pg_pool, app.app_uuid)
  } catch (e) {
    throw new common.NotFoundError('The specified dyno was not found.')
  }

  let info = await dyno_info(pg_pool, app.app_uuid, app.app_name, app.space_name)
  info = instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, info, release);
  info = info.filter((x) => {
    let alamo_appname = common.alamo.app_name(app.app_name, x.type);
    return alamo_appname + '-' + x.id === dyno_id || // match exactly the instance id.
    x.type + '.' + x.name === dyno_id || // match (type).(instance_name)
    x.name === dyno_id || // match by instance_name
    x.id === dyno_id; // match the uuid.
  });
  if(info.length === 0) {
    throw new common.NotFoundError('The specified dyno was not found.')
  }
  return httph.ok_response(res, JSON.stringify(info[0]))
}

// public
async function http_restart_all_dyno_types(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let formations = await common.formations_exists(pg_pool, app.app_uuid)
  for(let i=0; i < formations.length; i++) {
    try {
      await dyno_stop_type(pg_pool, app.app_uuid, app.app_name, app.space_name, formations[i].type, 'User Requested')
    } catch (e) {
      console.error(`Error: Unable to stop dyno ${app.app_uuid} ${formations[i].type}`, e)
    }
  }
  return httph.accepted_response(res, JSON.stringify({"status":"pending"}))
}

// public
async function http_restart_dyno_type(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let type = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  if(type.indexOf('.') === -1) {
    await dyno_stop_type(pg_pool, app.app_uuid, app.app_name, app.space_name, type, 'User Requested')
  } else {
    await dyno_stop(pg_pool, app.app_uuid, app.app_name, app.space_name, type, 'User Requested')
  }
  let dyno_info = type.split('.')
  return httph.accepted_response(res, JSON.stringify({"status":"pending", type:dyno_info[0], dyno:dyno_info[1]}));
}

// public
async function http_restart_dyno(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let dyno_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  await dyno_stop(pg_pool, app.app_uuid, app.app_name, app.space_name, dyno_id)
  let dyno_info = dyno_id.split('.')
  return httph.ok_response(res, JSON.stringify({"status":"pending", type:dyno_info[0], dyno:dyno_info[1]}));
}

// public
async function http_attach_dyno(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let dyno_key = httph.second_match(req.url, regex);
  let app = await common.app_exists(pg_pool, app_key);
  let payload = await httph.buffer_json(req);
  let [dyno_type, dyno_id] = dyno_key.split('.');

  // ensure the dyno exists before sending command
  let release = null
  try {
    release = await common.latest_release(pg_pool, app.app_uuid)
  } catch (e) {
    throw new common.NotFoundError('The specified dyno was not found.');
  }
  let info = await dyno_info(pg_pool, app.app_uuid, app.app_name, app.space_name);
  info = instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, info, release);
  if(info.filter((x) => x.type === dyno_type && x.name === dyno_id).length === 0) {
    throw new common.NotFoundError('The specified dyno was not found.');
  }
  let akkeris_instance_id = app.app_name + "-" + (dyno_type === "web" ? "" : ("-" + dyno_type)) + dyno_id;
  let passed = execute_whitelist.filter((x) => x.test(payload.command.join(' '))).length > 0 ? true : false;
  if(!passed) {
    throw new common.NotAllowedError()
  }
  return httph.ok_response(res, JSON.stringify(await common.alamo.dyno.attach(pg_pool, app.space_name, app.app_name, dyno_type, akkeris_instance_id, payload.command, payload.stdin)));
}

module.exports = {
  http:{
    list:http_list,
    get:http_get,
    restart_all_dyno_types:http_restart_all_dyno_types,
    restart_dyno_type:http_restart_dyno_type,
    restart_dyno:http_restart_dyno,
    attach_dyno:http_attach_dyno,
  }
};
