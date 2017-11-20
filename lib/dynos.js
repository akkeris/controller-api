"use strict"

const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const config = require('./config.js');
const common = require('./common.js');
const formations = require('./formations.js');
const logs = require('./log-drains.js');
const lifecycle = require('./lifecycle.js');
const releases = require('./releases.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

/**
 * If you're looking for creating dynos, updating, or deleting dynos see formations.js, 
 * dynos are representitive of the instance of a formation, not the actual definition
 * itself.  Confused? I know, its the parody between what "what I want to happen" and
 * "what happened".   Happy Hacking.
 */


// private
function instances_to_payload(app_uuid, app_name, space_name, org, insts, release) {
  return insts.map((instance) => {
    let name = instance.instanceid.replace(app_name + '-', '').replace(space_name + '-', '').replace(/\-\-/g, '-').replace('-' + instance.formation.type + '-', '');
    return {
      "attach_url":"",
      "command":instance.formation.command,
      "created_at":instance.starttime,
      "id":uuid.unparse(crypto.createHash('sha256').update(instance.instanceid).digest(), 16),
      "name":name,
      "release":{
        "id":release.release,
        "version":release.version,
      },
      "app":{
        "name":app_name + '-' + space_name,
        "id":app_uuid
      },
      "size":instance.formation.size,
      "state":instance.phase,
      "ready":instance.appstatus && instance.appstatus[0] ? instance.appstatus[0].readystatus : false,
      "type":instance.formation.type,
      "updated_at":instance.appstatus && instance.appstatus[0] ? instance.appstatus[0].startedat : instance.starttime
    }
  });
}

// public
// dyno_id is expected to be [type].[instance-id] where instance id is 
// the value returned from /v1/space/:space/app/:app/instance without the alamo
// app name prefix (and forward dash).  E.g., web.23452345-3452 or worker.2343244-2222
async function dyno_stop(pg_pool, app_name, space_name, dyno_id) {
  if(dyno_id.indexOf('.') === -1) {
    throw new common.NotFoundError('The specified yno id was not found.')
  }
  let type = dyno_id.substring(0, dyno_id.indexOf('.'));
  let alamo_appname = common.alamo.app_name(app_name, type);
  dyno_id = dyno_id.replace(/^[A-z]+\./, '')
  dyno_id = alamo_appname + '-' + dyno_id;
  return await common.alamo.dyno.stop(pg_pool, space_name, alamo_appname, dyno_id)
}

// public
async function instances(pg_pool, app_name, space_name, form) {
  let insts = await common.alamo.dyno.info(pg_pool, space_name, common.alamo.app_name(app_name, form.type))
  if(insts) {
    return insts.map((x) => { 
      x.formation = form;
      return x;
    });
  } else {
    return [];
  }
}

// public
async function stop(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let dyno_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  await dyno_stop(pg_pool, app.app_name, app.space_name, dyno_id)
  return httph.ok_response(res, '');
}

// public
async function list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let release = {release:null, version:null}
  try {
    release = await releases.latest_release(pg_pool, app.app_uuid)
  } catch (e) {
  }
  let forms = await formations.list_types(pg_pool, app.app_name, app.space_name)
  let insts = []
  for(let i=0; i < forms.length; i++) {
    insts.push(await instances(pg_pool, app.app_name, app.space_name, forms[i]))
  }
  insts = insts.reduce((x, y) => { return x.concat(y); }, []);
  return httph.ok_response(res, JSON.stringify(instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, insts, release)));
}

// public
async function info(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let dyno_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let release = null
  try {
    release = await releases.latest_release(pg_pool, app.app_uuid)
  } catch (e) {
    throw new common.NotFoundError('The specified dyno was not found.')
  }
  let forms = await formations.list_types(pg_pool, app.app_name, app.space_name)
  let insts = []
  for(let i=0; i < forms.length; i++) {
    insts.push(await instances(pg_pool, app.app_name, app.space_name, forms[i]))
  }
  insts = insts.reduce((x, y) => { return x.concat(y); }, []);
  insts = instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, insts, release);
  insts = insts.filter((x) => {
    let alamo_appname = common.alamo.app_name(app.app_name, x.type);
    return alamo_appname + '-' + x.id === dyno_id || // match exactly the instance id.
    x.type + '.' + x.name === dyno_id || // match (type).(instance_name)
    x.name === dyno_id || // match by instance_name
    x.id === dyno_id; // match the uuid.
  });
  if(insts.length === 0) {
    throw new common.NotFoundError('The specified dyno was not found.')
  }
  return httph.ok_response(res, JSON.stringify(insts[0]))
}

// public
let select_formation = query.bind(query, fs.readFileSync("./sql/select_formation.sql").toString('utf8'), (x) => { return x });
async function restart_dyno_type(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let formation_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)

  let type = null;
  let dyno = null;
  if(formation_id.indexOf('.') > -1) {
    // an instance was specified.
    [type, dyno] = formation_id.split('.');
  } else {
    type = formation_id;
  }
  let formation = await select_formation(pg_pool, [app.app_uuid, type])
  let response = {"status":"pending", type}
  if(formation.length === 0) {
    throw new common.NotFoundError('The dyno or dyno type was not found.');
  } else {
    if(dyno) {
      response.dyno = dyno;
      await lifecycle.restart_dyno(pg_pool, app.app_name, app.space_name, formation[0].type, dyno, 'User Requested')
    } else {
      await lifecycle.restart_dyno_type(pg_pool, app.app_name, app.space_name, formation[0].type, 'User Requested');
    }
    return httph.accepted_response(res, JSON.stringify(response));
  }
}

// public
async function restart_app(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  await lifecycle.restart_app(pg_pool, app.app_name, app.space_name, 'User Requested')
  return httph.accepted_response(res, JSON.stringify({"status":"pending"}))
}

module.exports = {
  list:list,
  info:info,
  stop:stop,
  restart_dyno:restart_dyno_type,
  restart_dyno_type:restart_dyno_type,
  restart_app:restart_app
};
