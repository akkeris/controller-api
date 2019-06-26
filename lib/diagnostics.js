const httph = require('./http_helper.js');

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

async function createHooks(pg_pool, req, res, regex) {
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


module.exports = {
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
  hooks: {
    create: createHooks,
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
