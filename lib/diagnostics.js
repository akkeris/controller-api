const assert = require('assert');
const httph = require('./http_helper.js');
const common = require('./common.js');
const uuid = require('uuid');
const query = require('./query.js');
const fs = require('fs');

let insert_diagnostic = query.bind(query, fs.readFileSync("./sql/insert_diagnostic.sql").toString('utf8'), null);
let select_diagnostic = query.bind(query, fs.readFileSync("./sql/select_diagnostic.sql").toString('utf8'), null);
let select_diagnostics = query.bind(query, fs.readFileSync("./sql/select_diagnostics.sql").toString('utf8'), null);
let select_raw_diagnostic = query.bind(query, 'select * from diagnostics where diagnostic::varchar(128) = $1', null);
let delete_diagnostic = query.bind(query, fs.readFileSync("./sql/delete_diagnostic.sql").toString("utf8"), null);
let update_diagnostic = query.bind(query, fs.readFileSync("./sql/update_diagnostic.sql").toString("utf8"), null);


function diagnostic_payload_to_postgres(p) {
  return [ p.id, p.job, p.jobspaceid, p.appid, p.action, p.result, p.image, p.pipelineid, p.transitionfrom, p.transitionto, p.timeout, p.startdelay, p.slackchannel, p.command];
}

async function diagnosticExists(pg_pool, diagnostic) {
  const records = await select_diagnostic(pg_pool, [diagnostic]);
  if (records.length !== 1) {
    return false;
  }
  return records[0];
}

async function listDiagnostics(pg_pool, req, res, regex) {
  return httph.ok_response(res, JSON.stringify(await select_diagnostics(pg_pool, [])));
}

async function getDiagnostic(pg_pool, req, res, regex) {
  let diagnostic_key = httph.first_match(req.url, regex);
  const diagnostic = await diagnosticExists(pg_pool, diagnostic_key);
  if (!diagnostic) {
    throw new httph.NotFoundError(`The specified diagnostic ${diagnostic_key} does not exist.`);
  }
  return httph.ok_response(res, JSON.stringify(diagnostic));
}

function checkDiagnosticPayload(payload) {
  assert.ok(payload.app, "The app field was not specified");
  assert.ok(payload.space, "The space field was not specified");
  assert.ok(payload.job, "The job name field was not specified")
  assert.ok(payload.job.indexOf('[') === -1 && payload.job.indexOf(']') === -1, "The job name cannot contain brackets.");
  assert.ok(payload.job.indexOf('_') === -1 && payload.job.indexOf('-') === -1, "The job name cannot contain underscores or hyphens.");
  assert.ok(payload.jobspace && /(^[A-z0-9\-]+$)/.exec(payload.jobspace) !== null, "The job space field was not specified"); 
  assert.ok((payload.job + "-" + payload.jobspace).length < 25, "The job name was too long, the job space and name must be less than 24 characters.");
  assert.ok(payload.action, "The action field was not specified.");
  assert.ok(payload.result, "The result field was not specified.");
  assert.ok(payload.image, "The image field was not specified.");
  assert.ok(payload.pipelinename, "The pipeline name field was not specified.");
  assert.ok(payload.transitionfrom, "The pipeline name field was not specified.");
  assert.ok(payload.transitionto, "The pipeline name field was not specified.");
  assert.ok(payload.timeout, "The pipeline name field was not specified.");
  assert.ok(payload.startdelay, "The pipeline name field was not specified.");
  assert.ok(payload.slackchannel, "The pipeline name field was not specified.");
}

async function createDiagnostic(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    checkDiagnosticPayload(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }

  let diagnostic = await diagnosticExists(pg_pool, `${payload.job}-${payload.jobspace}`);
  if (diagnostic) {
    throw new httph.ConflictError(`The diagnostic ${payload.job}-${payload.jobspace} already exists.`);
  }

  let app = await common.app_exists(pg_pool, `${payload.app}-${payload.space}`);
  let jobspace = await common.space_exists(pg_pool, payload.jobspace);
  let pipeline = await common.pipeline_exists(pg_pool, payload.pipelinename);

  payload.jobspaceid = jobspace.space;
  payload.appid = app.app_uuid;
  payload.pipelineid = pipeline.pipeline;
  payload.id = uuid.v4();
  
  if (payload.startdelay === 0) {
    payload.startdelay = process.env.TAAS_DEFAULT_START_DELAY
  }

  if (payload.pipelinename === 'manual') {
    payload.pipelinename = null;
    payload.transitionfrom = null;
    payload.transitionto = null;
  }

  const bindname = `${payload.job}-${payload.jobspace}-cs`;
  
  // akkeris.CreateConfigSet --------------------------------
  await common.alamo.config.set.create_custom(pg_pool, payload.jobspace, bindname, 'diagnostic');

  // akkeris.CreateVariables --------------------------------
  const vars = payload.env ? payload.env.reduce((acc, curr) => {
    acc[curr.name] = curr.value;
    return acc;
  }, {}) : {};

  vars["DIAGNOSTIC_LOG_ENDPOINT"] = `${process.env.TAAS_LOG_URL}/jobspace/${payload.jobspace}/job/${payload.job}/logs`;
  vars["DIAGNOSTIC_JOB_NAME"] =  payload.job;
  vars["DIAGNOSTIC_JOB_SPACE"] = payload.jobspace;
  vars["DIAGNOSTIC_APP"] = payload.app;
  vars["DIAGNOSTIC_APP_SPACE"] = payload.space;
  vars["DIAGNOSTIC_RUNID"] = uuid.v4();

  await common.alamo.config.batch(pg_pool, null, payload.jobspace, vars, bindname);
    
  // akkeris.CreateBind -------------------------------------
  await common.alamo.config.bind(pg_pool, null, payload.jobspace, payload.job, payload.jobspace, bindname, 'config');

  // akkeris.CreateService ----------------------------------
  const db_record = await insert_diagnostic(pg_pool, diagnostic_payload_to_postgres(payload));
  return httph.created_response(res, JSON.stringify(db_record));
}

async function deleteDiagnostic(pg_pool, req, res, regex) {
  // akkeris.DeleteService
  let diagnostic_key = httph.first_match(req.url, regex);
  const diagnostic = await diagnosticExists(pg_pool, diagnostic_key);
  if (!diagnostic) {
    throw new httph.NotFoundError(`The specified diagnostic ${diagnostic_key} does not exist.`);
  }

  await delete_diagnostic(pg_pool, [diagnostic.diagnostic]);

  const bindname = `${diagnostic.name}-${diagnostic.jobspace}-cs`;

  // akkeris.DeleteBind
  await common.alamo.config.unbind(pg_pool, null, diagnostic.jobspace, diagnostic.name, diagnostic.jobspace, bindname, 'config');

  // akkeris.DeleteSet
  await common.alamo.config.set.delete(pg_pool, null, diagnostic.jobspace, bindname);

  return httph.ok_response(res, 'Diagnostic deleted');
}

async function updateDiagnostic(pg_pool, req, res, regex) {
  let diagnostic_key = httph.first_match(req.url, regex);
  let payload = await httph.buffer_json(req);

  const diagnostic = await diagnosticExists(pg_pool, diagnostic_key);
  if (!diagnostic) {
    throw new httph.NotFoundError(`The specified diagnostic ${diagnostic_key} does not exist.`);
  }

  const [ rawDiagnostic ] = await select_raw_diagnostic(pg_pool, [diagnostic.diagnostic]);
  diagnostic.app_uuid = rawDiagnostic.app;
  diagnostic.pipeline_uuid = rawDiagnostic.pipeline;

  // figure out here if app-space or pipeline changed, and validate
  let app;
  if (payload.app) {
    const { app_uuid } = await common.app_exists(pg_pool, payload.app);
    if (app_uuid !== diagnostic.app_uuid) {
      app = app_uuid;
    }
  }
  
  let pipeline;
  if (payload.pipelinename) {
    const { pipeline: pipeline_uuid } = await common.pipeline_exists(pg_pool, payload.pipelinename);
    if (pipeline_uuid !== diagnostic.pipeline_uuid) {
      pipeline = pipeline_uuid;
    }
  }

  // handle unsetting optional variables (by setting to '', not omitting)
  const optional = [
    'timeout', 'startdelay', 'slackchannel', 'command'
  ].map((el) => {
    if (typeof payload[el] !== 'undefined' && payload[el] === '') {
      return null;
    } else {
      return payload[el] || diagnostic[el];
    }
  });

  if (payload.pipelinename !== '' && ( !diagnostic.transitionfrom && !payload.transitionfrom) ) {
    throw new httph.UnprocessibleEntityError("transitionfrom is required when specifying a pipeline");
  }

  if (payload.pipelinename !== '' && ( !diagnostic.transitionto && !payload.transitionto) ) {
    throw new httph.UnprocessibleEntityError("transitionto is required when specifying a pipeline");
  }

  const updatedDiagnostic = [
    diagnostic.diagnostic,
    app || diagnostic.app_uuid,
    payload.action || diagnostic.action,
    payload.result || diagnostic.result,
    payload.image || diagnostic.image,
    payload.pipelinename === '' ? null : (
      pipeline || diagnostic.pipeline_uuid
    ),
    payload.pipelinename === '' ? null : (
      payload.transitionfrom || diagnostic.transitionfrom
    ),
    payload.pipelinename === '' ? null : (
      payload.transitionto || diagnostic.transitionto
    ),
    ...optional,
  ];

  const [ result ] = await update_diagnostic(pg_pool, updatedDiagnostic);
  return httph.ok_response(res, JSON.stringify(result));
}

async function createConfig(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function deleteConfig(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function bindSecret(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function unbindSecret(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function getLogs(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function writeLogs(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function getLogArray(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function listRuns(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function rerun(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function storeBits(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function getRun(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function artifacts(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function handle_build_event(pg_pool, payload) {
  return;
}

async function handle_release_event(pg_pool, payload) {
  return;
}

function init(pg_pool) {
  common.lifecycle.on('build', handle_build_event.bind(null, pg_pool))
  common.lifecycle.on('release', handle_release_event.bind(null, pg_pool))
}

module.exports = {
  init,
  http: {
    list: listDiagnostics,
    get: getDiagnostic,
    create: createDiagnostic,
    delete: deleteDiagnostic,
    update: updateDiagnostic,
  },
  config: {
    create: createConfig,
    delete: deleteConfig,
  },
  secret: {
    create: bindSecret,
    delete: unbindSecret,
  },
  logs: {
    get: getLogs,
    create: writeLogs,
    array: getLogArray,
  },
  runs: {
    list: listRuns,
    rerun,
    storeBits, 
    get: getRun,
    artifacts,
  },
};
