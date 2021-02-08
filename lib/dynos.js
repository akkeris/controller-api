const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const common = require('./common.js');
const logs = require('./log-drains.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

const select_formation = query.bind(query, fs.readFileSync('./sql/select_formation.sql').toString('utf8'), (x) => x);

/**
 * If you're looking for creating dynos, updating, or deleting dynos see formations.js,
 * dynos are representitive of the instance of a formation, not the actual definition
 * itself.  Confused? I know, its the parody between what "what I want to happen" and
 * "what happened".   Happy Hacking.
 */

// private
function instances_to_payload(app_uuid, app_name, space_name, org, pods, release) {
  return pods.map((pod) => {
    const name = pod.instanceid.replace(`${app_name}-`, '').replace(`${space_name}-`, '').replace(/--/g, '-').replace(`-${pod.formation.type}-`, '');
    const stats = (
      pod.status
        ? (pod.status.filter((x) => x.output.indexOf(name) > -1)[0])
        : { ready: false, restarted: 0 }
    ) || { ready: false, restarted: 0 };

    const { ready } = stats;
    const restarts = stats.restarted;
    let status = pod.phase.split('/')[0].toLowerCase();
    const additional_info = (stats.state && stats.state.waiting && stats.state.waiting.message)
      ? stats.state.waiting.message : pod.reason;

    if (stats.state && stats.state.terminated) {
      status = 'stopping';
    } else if (pod.reason && pod.reason !== '' && pod.reason.toLowerCase().indexOf('failed to start') > -1) {
      status = 'start-failure';
    } else if (pod.reason && pod.reason !== '' && pod.reason.toLowerCase().indexOf('crashloopbackoff') > -1) {
      status = 'app-crashed';
    } else if (status === 'running' && !ready && restarts === 0 && pod.formation.type === 'web') {
      status = 'probe-failure';
    }
    return {
      attach_url: '',
      command: pod.formation.command,
      created_at: pod.starttime,
      id: uuid.unparse(crypto.createHash('sha256').update(pod.instanceid).digest(), 16),
      name,
      release: {
        id: release.release,
        version: release.version,
      },
      app: {
        name: `${app_name}-${space_name}`,
        id: app_uuid,
      },
      size: pod.formation.size,
      state: status,
      ready,
      restarts,
      type: pod.formation.type,
      updated_at: pod.appstatus && pod.appstatus[0] ? pod.appstatus[0].startedat : pod.starttime,
      additional_info,
    };
  });
}

// private
// dyno_id is expected to be [type].[instance-id] where instance id is
// the value returned from /v1/space/:space/app/:app/instance without the alamo
// app name prefix (and forward dash).  E.g., web.23452345-3452 or worker.2343244-2222
async function dyno_stop(pg_pool, app_uuid, app_name, space_name, dyno_id, why) {
  if (dyno_id.indexOf('.') === -1) {
    throw new common.NotFoundError('The specified dyno id was not found.');
  }
  const type = dyno_id.substring(0, dyno_id.indexOf('.'));
  const formation = await select_formation(pg_pool, [app_uuid, type]);
  if (formation.length === 0) {
    throw new common.NotFoundError(`The dyno type ${type} was not found.`);
  }
  const alamo_appname = common.alamo.app_name(app_name, type);
  dyno_id = dyno_id.replace(/^[A-z]+\./, '');
  const resp = await common.alamo.dyno.stop(pg_pool, space_name, alamo_appname, dyno_id);
  if (why) {
    logs.event(pg_pool, app_name, space_name, `Restarting ${type}.${dyno_id} (${why})`);
  }
  return resp;
}

// private
async function dyno_stop_type(pg_pool, app_uuid, app_name, space_name, type, why) {
  assert.ok(type.indexOf('.') === -1, 'The specified dyno type was actually a dyno instance.');
  const formation = await select_formation(pg_pool, [app_uuid, type]);
  if (formation.length === 0) {
    throw new common.NotFoundError(`The dyno type ${type} was not found.`);
  }
  // One-off dynos can't be stopped/restarted this way
  if (formation.oneoff) {
    throw new common.BadRequestError(`The dyno type ${type} is a one-off dyno and cannot be restarted`);
  }
  await common.alamo.dyno.restart(pg_pool, space_name, common.alamo.app_name(app_name, formation[0].type));
  if (why) {
    logs.event(pg_pool, app_name, space_name, `Restarting ${formation[0].type} (${why})`);
  }
}

// private
async function dyno_info(pg_pool, app_uuid, app_name, space_name) {
  const forms = await common.formations_exists(pg_pool, app_uuid);
  // eslint-disable-next-line no-return-await
  return (await Promise.all(forms.map(async (x) => await Promise.all([
    common.alamo.dyno.info(pg_pool, space_name, common.alamo.app_name(app_name, x.type)),
    common.alamo.dyno.status(pg_pool, space_name, common.alamo.app_name(app_name, x.type)),
    x,
  ]))))
    .map((x) => (x[0] ? x[0].map((y) => Object.assign(y, { formation: x[2], status: x[1] })) : []))
    .reduce((x, y) => x.concat(y), []);
}

// public
async function http_list(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  let release = { release: null, version: null };
  try {
    release = await common.latest_release(pg_pool, app.app_uuid);
  } catch (e) { /* ignore error */ }
  const info = await dyno_info(pg_pool, app.app_uuid, app.app_name, app.space_name);
  return httph.ok_response(res, JSON.stringify(
    instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, info, release),
  ));
}

// public
async function http_get(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const dyno_id = httph.second_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  let release = null;
  try {
    release = await common.latest_release(pg_pool, app.app_uuid);
  } catch (e) {
    throw new common.NotFoundError('The specified dyno was not found.');
  }

  let info = await dyno_info(pg_pool, app.app_uuid, app.app_name, app.space_name);
  info = instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, info, release);
  info = info.filter((x) => {
    const alamo_appname = common.alamo.app_name(app.app_name, x.type);
    return `${alamo_appname}-${x.id}` === dyno_id // match exactly the instance id.
    || `${x.type}.${x.name}` === dyno_id // match (type).(instance_name)
    || x.name === dyno_id // match by instance_name
    || x.id === dyno_id; // match the uuid.
  });
  if (info.length === 0) {
    throw new common.NotFoundError('The specified dyno was not found.');
  }
  return httph.ok_response(res, JSON.stringify(info[0]));
}

// public
async function http_restart_all_dyno_types(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  // Exclude one-off dynos, they should not be restarted this way
  const formations = (await common.formations_exists(pg_pool, app.app_uuid)).filter((x) => (!x.oneoff));
  for (let i = 0; i < formations.length; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await dyno_stop_type(pg_pool, app.app_uuid, app.app_name, app.space_name, formations[i].type, 'User Requested');
    } catch (e) {
      console.error(`Error: Unable to stop dyno ${app.app_uuid} ${formations[i].type}`, e);
    }
  }
  return httph.accepted_response(res, JSON.stringify({ status: 'pending' }));
}

// public
async function http_restart_dyno_type(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const type = httph.second_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);

  // is type a oneoff?
  const formation = (await common.formations_exists(pg_pool, app.app_uuid)).find((x) => (x.type === type));
  if (formation && formation.oneoff) {
    await common.alamo.oneoff_stop(pg_pool, app.space_name, app.app_name, type);
    return httph.ok_response(res, JSON.stringify({ status: 'stopping', type: formation.type }));
  }

  if (type.indexOf('.') === -1) {
    await dyno_stop_type(pg_pool, app.app_uuid, app.app_name, app.space_name, type, 'User Requested');
  } else {
    await dyno_stop(pg_pool, app.app_uuid, app.app_name, app.space_name, type, 'User Requested');
  }
  const info = type.split('.');
  return httph.accepted_response(res, JSON.stringify({ status: 'pending', type: info[0], dyno: info[1] }));
}

// public
async function http_restart_dyno(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const dyno_id = httph.second_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  await dyno_stop(pg_pool, app.app_uuid, app.app_name, app.space_name, dyno_id);
  const info = dyno_id.split('.');
  return httph.ok_response(res, JSON.stringify({ status: 'pending', type: info[0], dyno: info[1] }));
}

// These are the regex filters for allowed commands
const execute_allowlist = [
  /^sh -c kill -[0-9]+ -1$/,
];

// These pre-validated complicated commands can be run by specifying their "alias" name
const execute_aliases = {
  // Return java heap dump as a base64 encoded gzip string
  java_heap_dump: [
    '/bin/sh',
    '-c',
    "rm -f dump.hprof >/dev/null 2>&1; jcmd 0 GC.heap_dump dump.hprof > jcmd.log 2>&1; if [ -f \"./dump.hprof\" ] && [ -s \"./dump.hprof\" ] ; then cat dump.hprof | gzip | base64 | tr -d '\n'; else cat jcmd.log; fi; rm -f dump.hprof jcmd.log >/dev/null 2>&1",
  ],
};

// public
async function http_attach_dyno(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const dyno_key = httph.second_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const payload = await httph.buffer_json(req);
  const [dyno_type, dyno_id] = dyno_key.split('.');

  // ensure the dyno exists before sending command
  let release = null;
  try {
    release = await common.latest_release(pg_pool, app.app_uuid);
  } catch (e) {
    throw new common.NotFoundError('The specified dyno was not found.');
  }
  let info = await dyno_info(pg_pool, app.app_uuid, app.app_name, app.space_name);
  info = instances_to_payload(app.app_uuid, app.app_name, app.space_name, app.org_uuid, info, release);
  if (info.filter((x) => x.type === dyno_type && x.name === dyno_id).length === 0) {
    throw new common.NotFoundError('The specified dyno was not found.');
  }
  const akkeris_instance_id = `${app.app_name}-${dyno_type === 'web' ? '' : (`-${dyno_type}-`)}${dyno_id}`;

  if (payload.alias && payload.command) {
    throw new common.BadRequestError('Please specify either an alias OR a command');
  }

  // If alias was provided, make sure it's valid
  if (payload.alias && !Object.keys(execute_aliases).find((alias) => alias === payload.alias)) {
    throw new common.NotAllowedError('Invalid command alias');
  }

  // If command was provided, validate command against the allow list
  if (payload.command && execute_allowlist.filter((x) => x.test(payload.command.join(' '))).length <= 0) {
    throw new common.NotAllowedError();
  }

  // Full command to be run (either user-specified or expanded alias)
  const cmd = payload.command ? payload.command : execute_aliases[payload.alias];

  const user = req.headers['x-username'] || 'System';
  common.notify_audits(JSON.stringify({
    action: 'dyno-attachment',
    app: {
      name: app.app_name,
      id: app.app_uuid,
    },
    space: {
      name: app.space_name,
    },
    command: cmd,
    stdin: payload.stdin,
    dyno: {
      type: dyno_type,
      id: dyno_id,
    },
  }), user);
  await common.log_event(
    pg_pool,
    app.app_name,
    app.space_name,
    `${payload.alias ? `Alias "${payload.alias}"` : `Command "${cmd.join(' ')}"`} was executed on ${dyno_key} by ${user}`,
  );
  return httph.ok_response(res, JSON.stringify(await common.alamo.dyno.attach(
    pg_pool, app.space_name, app.app_name, dyno_type, akkeris_instance_id, cmd, payload.stdin,
  )));
}

module.exports = {
  http: {
    list: http_list,
    get: http_get,
    restart_all_dyno_types: http_restart_all_dyno_types,
    restart_dyno_type: http_restart_dyno_type,
    restart_dyno: http_restart_dyno,
    attach_dyno: http_attach_dyno,
  },
};
