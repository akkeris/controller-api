const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const url = require('url');
const config = require('./config.js');
const config_var = require('./config-var.js');
const common = require('./common.js');
const logs = require('./log-drains.js');
const httph = require('./http_helper.js');
const query = require('./query.js');


function validate_callback_auth(token, build_uuid) {
  let stamp = Math.round((new Date()).getTime() / 10000000);
  let hmac = crypto.createHmac('sha256', (config.simple_key[0] + stamp));
  hmac.update(build_uuid);
  if (hmac.digest('hex') === token) {
    return true;
  }
  stamp = Math.round((new Date()).getTime() / 10000000) - 1;
  hmac = crypto.createHmac('sha256', (config.simple_key[0] + stamp));
  hmac.update(build_uuid);
  if (hmac.digest('hex') === token) {
    return true;
  }

  return false;
}

function generate_callback_auth(build_uuid) {
  const stamp = Math.round((new Date()).getTime() / 10000000);
  const hmac = crypto.createHmac('sha256', (config.simple_key + stamp));
  hmac.update(build_uuid);
  return hmac.digest('hex');
}

const mark_build_status = query.bind(query, fs.readFileSync('./sql/update_build_status.sql').toString('utf8'), () => {});
async function build_status_change(pg_pool, build_uuid, foreign_key, foreign_type, building, status, user) {
  const item = await common.build_exists(pg_pool, build_uuid);
  const foreign_build_system = '1';
  await mark_build_status(pg_pool, [build_uuid, status, foreign_type, foreign_key, foreign_build_system]);
  if (status !== 'pending' && status !== 'queued') {
    logs.event(pg_pool, item.name, item.space, `Slug compilation ${status === 'succeeded' ? 'finished' : 'failed'}`);
  }
  const build_event = {
    action: 'build',
    app: { name: item.name, id: item.app },
    space: { name: item.space },
    build: {
      id: build_uuid,
      result: status,
      created_at: (new Date(item.created)).toISOString(),
      repo: item.repo,
      branch: item.branch,
      commit: item.sha,
    },
  };
  common.lifecycle.emit('build', build_event);
  common.notify_hooks(pg_pool, item.app, 'build', JSON.stringify(build_event), user || 'System');
  return item;
}

async function http_build_status_change(pg_pool, req, res, regex) {
  const build_key = httph.first_match(req.url, regex);
  const payload = await httph.buffer_json(req);
  if (!validate_callback_auth(req.headers.authorization, build_key)) {
    throw new common.UnauthorizedError('The specified authorization token was not valid.');
  }
  httph.ok_response(res, JSON.stringify(
    await build_status_change(pg_pool, build_key, payload.id, payload.type, payload.building, payload.status, req.headers['x-username']),
  ));
}

// private
function build_payload_to_obj(req_body, app_uuid, contents, userAgent, app_key, org, author, message) {
  const build_obj = {};
  build_obj.size = 0;
  build_obj.sha = req_body.sha;
  build_obj.branch = req_body.branch || '';
  build_obj.repo = req_body.repo || '';
  build_obj.version = req_body.version || '';
  build_obj.url = req_body.url;
  build_obj.logs = '';
  build_obj.app_logs = '';
  build_obj.app = app_uuid;
  build_obj.checksum = req_body.checksum;
  build_obj.status = 'queued';
  build_obj.user_agent = userAgent;
  build_obj.description = '';
  build_obj.modified = build_obj.created = new Date();
  build_obj.auto_build = null;
  build_obj.deleted = false;
  build_obj.app_key = app_key;
  build_obj.org = org;
  build_obj.auto_build = req_body.auto_build || null;
  build_obj.message = message;
  build_obj.author = author;
  return build_obj;
}


// private
function build_obj_to_response(build_obj) {
  const resp = {
    app: { id: build_obj.app },
    buildpacks: null,
    created_at: build_obj.created.toISOString(),
    id: build_obj.id,
    output_stream_url: `${config.akkeris_api_url}/apps/${build_obj.app_key}/builds/${build_obj.id}/result`,
    source_blob: {
      checksum: build_obj.checksum,
      url: '',
      version: build_obj.version,
      commit: build_obj.sha,
      author: build_obj.author,
      repo: build_obj.repo,
      message: build_obj.message,
    },
    release: null,
    slug: { id: build_obj.id },
    status: build_obj.status,
    updated_at: build_obj.modified.toISOString(),
    user: {
      id: uuid.unparse(crypto.createHash('sha256').update(build_obj.org).digest(), 16),
      email: '',
    },
  };
  if (build_obj.foreign_build_key) {
    resp.slug.number = build_obj.foreign_build_key;
  }
  return resp;
}

// private
function build_postgres_to_obj(pg_result) {
  pg_result.id = pg_result.build;
  pg_result.modified = pg_result.updated;
  pg_result.app_key = `${pg_result.name}-${pg_result.space}`;
  return pg_result;
}

// private
function build_obj_to_postgres(build) {
  return [
    build.id,
    build.app,
    build.created,
    build.modified,
    build.sha,
    build.checksum,
    build.logs,
    build.app_logs,
    build.size,
    build.url,
    build.status,
    build.repo,
    build.branch,
    build.version,
    build.user_agent,
    build.description,
    false,
    build.auto_build,
    build.foreign_build_key,
    build.message,
    build.author,
  ];
}

const select_builds = query.bind(query, fs.readFileSync('./sql/select_builds.sql').toString('utf8'), build_postgres_to_obj);

// private
async function check_build_succeeded(pg_pool, build_uuid) {
  const build_result = await common.build_exists(pg_pool, build_uuid);
  if (build_result.status !== 'succeeded') {
    return null;
  }
  build_result.docker_registry_url = common.registry_image(
    build_result.org, build_result.name, build_result.app, build_result.foreign_build_key, build_result.foreign_build_system,
  );
  return build_result;
}

// private
async function request_build_docker(pg_pool, app, app_uuid, space, sha, branch, repo, org, build_uuid, sources) {
  let callback_url = config.akkeris_app_controller_url;
  if (process.env.TEST_CALLBACK) {
    callback_url = process.env.TEST_CALLBACK;
  }
  const build_args = {
    AKKERIS_GIT_SHA1: sha,
    AKKERIS_GIT_BRANCH: branch,
    AKKERIS_GIT_REPO: repo,
    ...(await config_var.get_app_only(pg_pool, app, space)),
  };
  const build_params = {
    sha,
    app,
    space,
    branch,
    repo,
    org,
    kafka_hosts: (await common.alamo.get_kafka_hosts(pg_pool, space)),
    build_number: ((await select_builds(pg_pool, [app_uuid])).length + 1),
    build_uuid,
    app_uuid,
    sources,
    build_args,
    callback: `${callback_url}/builds/${build_uuid}`,
    callback_auth: generate_callback_auth(build_uuid),
    gm_registry_host: config.gm_registry_host,
    gm_registry_repo: config.gm_registry_repo,
    docker_registry: '',
    docker_login: '',
    docker_password: '',
  };
  if (config.gm_registry_auth) {
    build_params.gm_registry_auth = config.gm_registry_auth;
  }
  if (sources.toLowerCase().startsWith('docker://')) {
    const docker_uri = new url.URL(sources);
    try {
      assert.ok(docker_uri.pathname.indexOf(':') > -1, 'No tag for the specified docker image was used. Please add a unique tag name.');
      build_params.docker_registry = docker_uri.host + docker_uri.pathname;
      build_params.docker_login = docker_uri.username || '';
      build_params.docker_password = docker_uri.password || '';
    } catch (e) {
      throw new common.UnprocessibleEntityError(e.message);
    }
  }
  await httph.request('post', config.build_shuttle_url, { 'content-type': 'application/json' }, JSON.stringify(build_params));
}


const create_build_record = query.bind(query, fs.readFileSync('./sql/insert_build.sql').toString('utf8'), () => {});
async function create(
  pg_pool,
  app_uuid,
  app_name,
  space_name,
  space_tags,
  org,
  auto_build,
  repo,
  branch,
  version,
  checksum,
  sha,
  build_url,
  author,
  message,
) {
  if (app_name.indexOf('-') > -1) {
    throw new common.UnprocessibleEntityError(`Invalid application name ${app_name}`);
  }
  checksum = checksum || '';
  sha = sha || '';

  if (!build_url || typeof (build_url) !== 'string') {
    throw new common.UnprocessibleEntityError('A "url" field with a valid URI is required, note this can be a data uri with a zip/tar.gz blob of your sources.');
  }
  const build_obj = build_payload_to_obj({
    auto_build, repo, branch, version, checksum, sha, url: build_url,
  }, app_uuid, build_url, 'aka', `${app_name}-${space_name}`, org, author, message);
  build_obj.id = uuid.v4();
  build_obj.foreign_build_key = 0;
  const org_build_url = build_obj.url;
  if (!build_obj.url) {
    build_obj.url = '';
  }
  if (build_obj.url.length > 1024) {
    build_obj.url = build_obj.url.substring(0, 1024);
  }
  await create_build_record(pg_pool, build_obj_to_postgres(build_obj));
  logs.event(pg_pool, app_name, space_name, 'Slug compilation started');
  await request_build_docker(
    pg_pool,
    app_name,
    app_uuid,
    space_name,
    build_obj.sha,
    build_obj.branch,
    build_obj.repo,
    org,
    build_obj.id,
    org_build_url,
  );
  return build_obj_to_response(build_obj);
}

// public
async function http_create(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const payload = await httph.buffer_json(req);
  const app = await common.app_exists(pg_pool, app_key);
  const space = await common.space_exists(pg_pool, app.space_name);

  if (!(req.headers['x-elevated-access'] === 'true' && req.headers['x-username'])
      && (space.tags.indexOf('compliance=socs') > -1 || space.tags.indexOf('compliance=prod') > -1)) {
    throw new common.NotAllowedError('Arbitrary builds on this application can only be created by administrators.');
  }

  if (!payload.author && req.headers['x-username']) {
    payload.author = req.headers['x-username'];
  }
  httph.created_response(res, JSON.stringify(
    await create(
      pg_pool,
      app.app_uuid,
      app.app_name,
      app.space_name,
      app.space_tags,
      app.org_name,
      payload.auto_build,
      payload.repo,
      payload.branch,
      payload.version,
      payload.checksum,
      payload.sha,
      payload.url,
      payload.author,
      payload.message,
    ),
  ));
}

// public
async function http_list(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  await common.app_exists(pg_pool, app_key);
  const builds = (await select_builds(pg_pool, [app_key])).map(build_obj_to_response);
  return httph.ok_response(res, JSON.stringify(builds));
}

// public
async function http_get(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const build_key = httph.second_match(req.url, regex);
  common.check_uuid(build_key);
  await common.app_exists(pg_pool, app_key);
  return httph.ok_response(res, JSON.stringify(
    build_obj_to_response(
      build_postgres_to_obj(await common.build_exists(pg_pool, build_key)),
    ),
  ));
}

// public
async function http_get_slug(pg_pool, req, res, regex) {
  const build_key = httph.first_match(req.url, regex);
  common.check_uuid(build_key);
  return httph.ok_response(res, JSON.stringify(
    build_obj_to_response(
      build_postgres_to_obj(await common.build_exists(pg_pool, build_key, true)),
    ),
  ));
}

// public
async function rebuild(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const build_key = httph.second_match(req.url, regex);
  common.check_uuid(build_key);
  const app = await common.app_exists(pg_pool, app_key);
  const build = await common.build_exists(pg_pool, build_key);
  const build_shuttle_source_url = `${config.build_shuttle_url}/${build.build}`;

  // Will throw a 422 unprocessible error to bubble if the resource does not exist.
  try {
    await httph.request('head', build_shuttle_source_url, {}, null);
  } catch (err) {
    throw new common.UnprocessibleEntityError('This build has been archived and cannot be rebuilt from sources (or was not build via appkit/alamo).');
  }
  const req_body = {
    sha: build.sha,
    branch: build.branch,
    repo: build.repo,
    version: build.version,
    checksum: build.checksum,
    auto_build: build.auto_build,
    description: `Rebuild of ${build.build}`,
    url: build_shuttle_source_url,
  };
  const build_obj = build_payload_to_obj(req_body, app.app_uuid, req_body.url, 'aka', app.app_name, app.org_name);
  const build_uuid = uuid.v4();
  build_obj.id = build_uuid;
  build_obj.foreign_build_key = 0;
  if (!build_obj.url || build_obj.url.length > 1024) {
    build_obj.url = '';
  }
  await create_build_record(pg_pool, build_obj_to_postgres(build_obj));
  logs.event(pg_pool, app.app_name, app.space_name, 'Slug compilation started');

  await request_build_docker(
    pg_pool,
    app.app_name,
    app.app_uuid,
    app.space_name,
    build_obj.sha,
    build_obj.branch,
    build_obj.repo,
    app.org_name,
    build_uuid,
    build_obj.url,
  );

  return httph.created_response(res, JSON.stringify(build_obj_to_response(build_obj)));
}

// private
function strip_build_results(content) {
  // Filter out docker build output and other uninteresting items so that we dont accidently leak private
  // information outside of alamo.
  return content.replace(/^Step [0-9/]+ : ARG .*$/gm, '')
    .replace(/^ ---> .*$/gm, '')
    .replace(/^\+ .*$/gm, '')
    .replace(/^The push refers to a repository .*$/gm, '')
    .replace(/^tar: .*/gm, '')
    .replace(/^gzip: .*/gm, '')
    .replace(/[\n\r]+\s*[\n\r]+/g, '\n')
    .replace(/^Sending build context to Docker daemon .*$/gm, '');
}

// public
async function result(pg_pool, app_name, app_uuid, build_uuid) {
  const build = await common.build_exists(pg_pool, build_uuid);
  if (build.status === 'queued') {
    return Object.assign(build, { content: [] });
  }
  let content = null;
  try {
    content = await httph.request(
      'get',
      `${config.build_shuttle_url}/${app_name}-${app_uuid}/${build.foreign_build_key}/logs`,
      { 'content-type': 'application/json', 'x-silent-error': 'true' },
      null,
    );
  } catch (e) { /* ignore errors */ }

  if (content) {
    try {
      content = JSON.parse(content);
    } catch (e) {
      content = { output: content };
    }
    content.output = content.output || '';
    content.output = strip_build_results(content.output);
    content = content.output.split('\n');
    return Object.assign(build, { content });
  }
  return Object.assign(build, { content: [] });
}

// public
async function http_result(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const build_uuid = httph.second_match(req.url, regex);
  common.check_uuid(build_uuid);
  const app = await common.app_exists(pg_pool, app_key);
  const br = await result(pg_pool, app.app_name, app.app_uuid, build_uuid);
  return httph.ok_response(res, JSON.stringify({
    build: {
      id: br.id,
      status: br.status,
      output_stream_url: `${config.akkeris_api_url}/apps/${app.app_name}-${app.space_name}/builds/${br.id}/result`,
    },
    lines: br.content,
  }));
}

// public
async function stop(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const build_uuid = httph.second_match(req.url, regex);
  common.check_uuid(build_uuid);
  const app = await common.app_exists(pg_pool, app_key);
  const build = build_postgres_to_obj(await common.build_exists(pg_pool, build_uuid));
  if (build.status === 'queued') {
    throw new common.ConflictError(`The specified app ${app_key} exists, but is not yet building.`);
  }
  if (build.status === 'succeeded' || build.status === 'failed') {
    throw new common.ConflictError(`The specified app ${app_key} exists, but the build ${build_uuid} has already finished.`);
  }

  await httph.request('delete', `${config.build_shuttle_url}/${app.app_name}-${app.app_uuid}/${build.foreign_build_key}`, {}, null);
  const foreign_build_system = '1';
  await mark_build_status(pg_pool, [build.id, 'failed', 'The specified build was stopped.', build.foreign_build_key, foreign_build_system]);
  return httph.reset_response(res, JSON.stringify({
    id: build.id,
    status: 'failed',
    output_stream_url: `${config.akkeris_api_url}/apps/${app.app_name}-${app.space_name}/builds/${build.id}/result`,
  }));
}

async function latest_build(pg_pool, app_uuid) {
  const builds = (await select_builds(pg_pool, [app_uuid]))
    .map(build_obj_to_response)
    .sort((a, b) => ((new Date(a.created)).getTime() > (new Date(b.created)).getTime() ? -1 : 1));
  return builds[0];
}

const select_pending_build_query = query.bind(query, fs.readFileSync('./sql/select_pending_builds.sql').toString('utf8'), build_postgres_to_obj);
async function delete_job_if_exists(pg_pool, app_name, app_uuid) {
  const pending_builds = await select_pending_build_query(pg_pool, [app_uuid]);
  await Promise.all(pending_builds.map(async (pb) => {
    await httph.request('delete', `${config.build_shuttle_url}/${app_name}-${app_uuid}/${pb.foreign_build_key}`, { 'x-ignore-errors': true }, null);
  }));
  return httph.request('delete', `${config.build_shuttle_url}/${app_name}-${app_uuid}`, {}, null);
}

module.exports = {
  create,
  http: {
    create: http_create,
    list: http_list,
    get: http_get,
    status_change: http_build_status_change,
    result: http_result,
    get_slug: http_get_slug,
  },
  result,
  latest_build,
  list: select_builds,
  stop,
  rebuild,
  succeeded: check_build_succeeded,
  delete_job_if_exists,
  strip_build_results,
};
