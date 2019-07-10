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

function from_alamo_to_config_var(config_vars_tmp) {
  let config_vars = {};
  if(config_vars_tmp) {
    config_vars_tmp.forEach((x) => config_vars[x.varname] = x.varvalue);
  }
  return config_vars;
}

async function diagnosticExists(pg_pool, diagnostic) {
  const records = await select_diagnostic(pg_pool, [diagnostic]);
  return records.length === 1 ? records[0] : false;
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

  const space = await common.space_exists(pg_pool, diagnostic.space);

  const bindname = `${diagnostic.name}-${diagnostic.space}-cs`;
  // Get environment variables
  const isTaasEnv = (v) => !v.varname.startsWith('TAAS_') && !v.varname.startsWith('DIAGNOSTIC_');

  const allVars = (await common.alamo.config.set.request(pg_pool, null, diagnostic.space, bindname)).filter(isTaasEnv);
  const vars = from_alamo_to_config_var(allVars);

  if(space.tags.indexOf('compliance=socs') > -1) {
    diagnostic.env = common.socs(vars);
  } else {
    diagnostic.env = vars;
  }

  return httph.ok_response(res, JSON.stringify(diagnostic));
}

function checkDiagnosticPayload(payload) {
  // field specification
  assert.ok(payload.name, "The name field was not specified");
  assert.ok(payload.space, "The space field was not specified");
  assert.ok(payload.app, "The app field was not specified");
  assert.ok(payload.action, "The action field was not specified.");
  assert.ok(payload.result, "The result field was not specified.");
  assert.ok(payload.image, "The image field was not specified.");
  assert.ok(payload.timeout, "The timeout field was not specified.");
  assert.ok(payload.slackchannel, "The slackchannel field was not specified.");
  if (typeof payload.pipeline !== 'undefined' && payload.pipeline !== '' && payload.pipeline !== 'manual') {
    assert.ok(payload.transitionfrom, "The transition from field was not specified.");
    assert.ok(payload.transitionto, "The transition to field was not specified.");
  }

  // input validation
  assert.ok(payload.name.indexOf('[') === -1 && payload.name.indexOf(']') === -1, "The name cannot contain brackets.");
  assert.ok(payload.name.indexOf('_') === -1 && payload.name.indexOf('-') === -1, "The name cannot contain underscores or hyphens.");
  assert.ok(payload.space && /(^[A-z0-9\-]+$)/.exec(payload.space) !== null, "The space field was not specified"); 
  assert.ok((payload.name + "-" + payload.space).length < 25, "The complete name was too long, the space and name must be less than 24 characters."); 
}

async function createDiagnostic(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    checkDiagnosticPayload(payload);
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }

  let record = await diagnosticExists(pg_pool, `${payload.name}-${payload.space}`);
  if (record) {
    throw new httph.ConflictError(`The diagnostic ${payload.name}-${payload.space} already exists.`);
  }

  const app = await common.app_exists(pg_pool, payload.app);
  payload.app_id = app.app_uuid;
  payload.app_name = app.app_name;
  payload.app_space_name = app.space_name;
  payload.app_space_id = app.space_uuid;

  payload.space_id = (await common.space_exists(pg_pool, payload.space)).space;
  payload.id = uuid.v4();
  payload.startdelay = payload.startdelay || process.env.TAAS_DEFAULT_START_DELAY;

  if (!payload.pipeline || payload.pipeline === '' || payload.pipeline === 'manual') {
    payload.pipeline_id = null;
    payload.transitionfrom = null;
    payload.transitionto = null;
  } else {
    payload.pipeline_id = (await common.pipeline_exists(pg_pool, payload.pipeline)).pipeline;
  }

  if (payload.org === "") {
    payload.org = null;
  }

  if (payload.org) {
    payload.org = (await common.org_exists(pg_pool, payload.org)).org;
  }

  const bindname = `${payload.name}-${payload.space}-cs`;
  
  // akkeris.CreateConfigSet --------------------------------
  await common.alamo.config.set.create_custom(pg_pool, payload.space, bindname, 'diagnostic');

  // akkeris.CreateVariables --------------------------------
  const vars = (Array.isArray(payload.env) && payload.env.length > 0) ? payload.env.reduce((acc, curr) => {
    acc[curr.name] = curr.value;
    return acc;
  }, {}) : {};

  vars["DIAGNOSTIC_LOG_ENDPOINT"] = `${process.env.TAAS_LOG_URL}/jobspace/${payload.space}/job/${payload.name}/logs`;
  vars["DIAGNOSTIC_JOB_NAME"] =  payload.name;
  vars["DIAGNOSTIC_JOB_SPACE"] = payload.space;
  vars["DIAGNOSTIC_APP"] = payload.app_name;
  vars["DIAGNOSTIC_APP_SPACE"] = payload.app_space_name;
  vars["DIAGNOSTIC_RUNID"] = uuid.v4();

  await common.alamo.config.batch(pg_pool, null, payload.space, vars, bindname);
    
  // akkeris.CreateBind -------------------------------------
  await common.alamo.config.bind(pg_pool, null, payload.space, payload.name, payload.space, bindname, 'config');

  // akkeris.CreateService ----------------------------------
  const diagnostic = [
    payload.id, payload.name, payload.space_id, payload.app_id,
    payload.action, payload.result, payload.image, payload.pipeline_id,
    payload.transitionfrom, payload.transitionto, payload.timeout,
    payload.startdelay, payload.slackchannel, payload.command, payload.org
  ];

  const db_record = await insert_diagnostic(pg_pool, diagnostic);
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

  const bindname = `${diagnostic.name}-${diagnostic.space}-cs`;

  // akkeris.DeleteBind
  await common.alamo.config.unbind(pg_pool, null, diagnostic.space, diagnostic.name, diagnostic.space, bindname, 'config');

  // akkeris.DeleteSet
  await common.alamo.config.set.delete(pg_pool, null, diagnostic.space, bindname);

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
  if (payload.pipeline) {
    const { pipeline: pipeline_uuid } = await common.pipeline_exists(pg_pool, payload.pipeline);
    if (pipeline_uuid !== diagnostic.pipeline_uuid) {
      pipeline = pipeline_uuid;
    }
  }

  if (payload.pipeline !== '' && ( !diagnostic.transitionfrom && !payload.transitionfrom) ) {
    throw new httph.UnprocessibleEntityError("transitionfrom is required when specifying a pipeline");
  }

  if (payload.pipeline !== '' && ( !diagnostic.transitionto && !payload.transitionto) ) {
    throw new httph.UnprocessibleEntityError("transitionto is required when specifying a pipeline");
  }

  // handle unsetting optional variables (by setting to '', not omitting)
  const checkOptional = el => {
    if (typeof payload[el] !== 'undefined' && payload[el] === '') {
      return null;
    } else {
      return payload[el] || diagnostic[el];
    }
  };

  const startdelay = checkOptional('startdelay');
  const command = checkOptional('command');

  const updatedDiagnostic = [
    diagnostic.diagnostic,
    app || diagnostic.app_uuid,
    payload.action || diagnostic.action,
    payload.result || diagnostic.result,
    payload.image || diagnostic.image,
    payload.pipeline === '' ? null : (
      pipeline || diagnostic.pipeline_uuid
    ),
    payload.pipeline === '' ? null : (
      payload.transitionfrom || diagnostic.transitionfrom
    ),
    payload.pipeline === '' ? null : (
      payload.transitionto || diagnostic.transitionto
    ),
    payload.timeout || diagnostic.timeout,
    startdelay,
    payload.slackchannel || diagnostic.slackchannel,
    command,
  ];

  const [ result ] = await update_diagnostic(pg_pool, updatedDiagnostic);
  return httph.ok_response(res, JSON.stringify(result));
}

async function setConfig(pg_pool, req, res, regex) {
  let diagnostic_key = httph.first_match(req.url, regex);
  let payload = await httph.buffer_json(req);

  const diagnostic = await diagnosticExists(pg_pool, diagnostic_key);
  if (!diagnostic) {
    throw new httph.NotFoundError(`The specified diagnostic ${diagnostic_key} does not exist.`);
  }
  
  if (!payload.varname) {
    throw new httph.UnprocessibleEntityError("varname is required")
  }

  if (!payload.varvalue) {
    throw new httph.UnprocessibleEntityError("varvalue is required")
  }

  const bindname = `${diagnostic.name}-${diagnostic.space}-cs`;

  const configvars = await common.alamo.config.set.request(pg_pool, null, diagnostic.space, bindname)

  if (configvars && configvars.some(env => env.varname === payload.varname)) {
    const result = await common.alamo.config.update(pg_pool, null, diagnostic.space, payload.varname, payload.varvalue, bindname);
    return httph.ok_response(res, JSON.stringify(result));
  } else {
    const result = await common.alamo.config.add(pg_pool, null, diagnostic.space, payload.varname, payload.varvalue, bindname);
    return httph.created_response(res, JSON.stringify(result));
  }
}

async function unsetConfig(pg_pool, req, res, regex) {
  let diagnostic_key = httph.first_match(req.url, regex);
  let varname = httph.second_match(req.url, regex);

  const diagnostic = await diagnosticExists(pg_pool, diagnostic_key);
  if (!diagnostic) {
    throw new httph.NotFoundError(`The specified diagnostic ${diagnostic_key} does not exist.`);
  }

  const bindname = `${diagnostic.name}-${diagnostic.space}-cs`;
  const configvars = await common.alamo.config.set.request(pg_pool, null, diagnostic.space, bindname)

  const configvar = configvars.find(v => v.varname === varname);
  if (!configvar) {
    throw new httph.NotFoundError(`The configuration variable ${varname} does not exist.`);
  }

  const result = await common.alamo.config.delete(pg_pool, null, diagnostic.space, varname, bindname);
  return httph.ok_response(res, JSON.stringify(result));
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
    set: setConfig,
    unset: unsetConfig,
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
