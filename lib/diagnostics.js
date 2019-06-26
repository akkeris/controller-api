const httph = require('./http_helper.js');
const common = require('./common.js');

async function listDiagnostics(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function getDiagnostic(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function createDiagnostic(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function deleteDiagnostic(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
}

async function updateDiagnostic(pg_pool, req, res, regex) {
  return httph.ok_response(res, 'Not implemented');
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
