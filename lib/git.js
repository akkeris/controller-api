const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const url = require('url');
const uuid = require('uuid');
const common = require('./common.js');
const config = require('./config.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');
const auto_builds = require('./auto_builds.js');
const previews = require('./previews.js');
const routes = require('./routes.js');
const builds = require('./builds.js');
const apps = require('./apps');

const select_validation_token = query.bind(query, fs.readFileSync('./sql/select_validation_token.sql').toString('utf8'), (d) => d);
const allowed_types = ['push', 'pull_request'];


function format_git_repo_url(repo) {
  repo = repo.toLowerCase().trim();
  if (repo.startsWith('git@')) {
    repo = `https://${repo.substring(4).replace(':', '/')}`;
  }
  if (repo.startsWith('http://')) {
    repo = `https://${repo.substring(7)}`;
  }
  if (repo.startsWith('https://www.')) {
    repo = `https://${repo.substring(12)}`;
  }
  if (repo.indexOf('.git') > -1) {
    repo = repo.substring(0, repo.indexOf('.git'));
  }
  repo = http_help.clean_forward_slash(repo);
  return repo;
}

// private
function postgres_to_response(pg_auto_builds) {
  return {
    app: {
      id: pg_auto_builds.app,
      name: `${pg_auto_builds.appname}-${pg_auto_builds.spacename}`,
    },
    auto_deploy: pg_auto_builds.auto_deploy,
    branch: pg_auto_builds.branch,
    created_at: pg_auto_builds.created.toISOString(),
    id: pg_auto_builds.auto_build,
    organization: {
      id: pg_auto_builds.org,
      name: pg_auto_builds.organization,
    },
    repo: pg_auto_builds.repo,
    site: pg_auto_builds.site,
    space: {
      id: pg_auto_builds.space,
      name: pg_auto_builds.spacename,
    },
    status_check: pg_auto_builds.wait_on_status_checks,
    updated_at: pg_auto_builds.updated.toISOString(),
    username: pg_auto_builds.username,
  };
}

// private
async function remove_webhook_if_needed(app_key, repo, token) {
  if (process.env.TEST_MODE) {
    return;
  }
  const repo_url = new url.URL(http_help.clean_forward_slash(repo));
  const github_hooks_api = `https://api.github.com/repos${repo_url.pathname}/hooks`;
  const github_headers = { 'user-agent': 'akkeris-controller-api', authorization: `token ${token}`, 'x-silent-error': true };
  let hooks = await http_help.request('get', github_hooks_api, github_headers, null);
  hooks = JSON.parse(hooks);
  // Find auto build webhook
  const hook = hooks.filter((h) => h.config.url === `${config.akkeris_app_controller_url}/apps/${app_key}/builds/auto/github`);
  if (hook.length !== 0) {
    try {
      await http_help.request('delete', `${github_hooks_api}/${hook[0].id}`, github_headers, null);
    } catch (err) {
      // 404 means the hook was already deleted so we can ignore that
      if (err.code !== 404) {
        throw err;
      }
    }
  }
}

// private
async function create_webhook_if_needed(app_key, repo, token, user) {
  if (process.env.TEST_MODE) {
    return { validation_token: 'testing', hook: { created: true }, existing: (token === 'existing') };
  }
  const repo_url = new url.URL(http_help.clean_forward_slash(repo));
  // list webhooks
  const alamo_hook_url = `${config.akkeris_app_controller_url}/apps/${app_key}/builds/auto/github`;
  const github_hooks_api = `https://api.github.com/repos${repo_url.pathname}/hooks`;
  const github_headers = { 'user-agent': 'akkeris-controller-api', authorization: `token ${token}`, 'x-silent-error': true };
  let hooks = null;
  try {
    hooks = await http_help.request('get', github_hooks_api, github_headers, null);
  } catch (e) {
    if (e.code === 404 || e.code === 403) {
      throw new common.BadRequestError(`The repo ${repo} does not exist or the user ${user} does not have admin permissions to it.`);
    } else if (e.code === 401) {
      throw new common.BadRequestError(`The token or user provided is not valid for the repo ${repo}.`);
    } else {
      throw e;
    }
  }
  try {
    hooks = JSON.parse(hooks);
  } catch (e) {
    throw new common.BadRequestError('Malformed JSON response');
  }
  // See if webhook is already set.
  const hook = hooks.filter((h) => h.config.url === alamo_hook_url);
  if (hook.length !== 0) {
    return { hook: hook[0], existing: true };
  }
  // create a new one
  const validation_token = uuid.v4();
  const github_webhook_payload = {
    name: 'web',
    active: true,
    events: allowed_types,
    config: {
      url: alamo_hook_url,
      content_type: 'json',
      secret: validation_token,
    },
  };
  await http_help.request('post', github_hooks_api, github_headers, JSON.stringify(github_webhook_payload));
  return { validation_token, existing: false };
}

const insert_authorization = query.bind(query, fs.readFileSync('./sql/insert_authorization.sql').toString('utf8'), (d) => d);
const delete_auto_build = query.bind(query, fs.readFileSync('./sql/delete_auto_build.sql').toString('utf8'), (d) => d);

// public
function calculate_hash(secret, data) {
  const hmac = crypto.createHmac('sha1', secret);
  return `sha1=${hmac.update(data).digest('hex')}`;
}

// public
async function http_github_delete_auto_build(pg_pool, req, res, regex) {
  const app_key = http_help.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const query_data = await select_validation_token(pg_pool, [app.app_uuid]);
  if (query_data.length === 0) {
    throw new common.NotFoundError('An auto build was not found for this app.');
  }
  const token = common.decrypt_token(config.encrypt_key, query_data[0].token);
  const response_message = '{"status":"successful"}';
  try {
    await remove_webhook_if_needed(`${app.app_name}-${app.space_name}`, query_data[0].repo, token);
  } catch (err) {
    if (err.code === 401) {
      // 401 means the cached token was invalidated
      await delete_auto_build(pg_pool, [app.app_uuid]);
      throw new common.UnprocessibleEntityError(`Auto build removed, but the cached Github token was invalid- please manually remove any Akkeris hooks from the ${query_data[0].repo} repository`);
    } else {
      // Something else weird happened
      console.log('error removing auto build webhook from Github:', err);
      throw new common.InternalServerError('Internal Server Error');
    }
  }
  await delete_auto_build(pg_pool, [app.app_uuid]);
  return http_help.ok_response(res, response_message);
}

// public
async function http_github_get_auto_build(pg_pool, req, res, regex) {
  const app_key = http_help.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const auto_build = await auto_builds.get(pg_pool, app.app_uuid);
  delete auto_build.validation_token;
  delete auto_build.authorization;
  return http_help.ok_response(res, postgres_to_response(auto_build));
}

async function create_build_from_scm(pg_pool, app_uuid, repo, branch, token) {
  const app = await common.app_exists(pg_pool, app_uuid);
  const headers = { 'user-agent': 'akkeris-controller-api', 'x-silent-error': true, authorization: `token ${token}` };

  const repo_org_and_name = new url.URL(http_help.clean_forward_slash(repo));

  const branch_response = await http_help.request(
    'get', `https://api.github.com/repos${repo_org_and_name.pathname}/branches/${branch}`, headers, null,
  );
  const { commit: { sha, commit: { url: link_url, message, author: { name: author } } } } = JSON.parse(branch_response);

  let content_url = `https://api.github.com/repos${repo_org_and_name.pathname}/zipball/${branch}`;
  const content_response = await http_help.request('get', content_url, { 'x-response': true, ...headers }, null);
  content_url = content_response.headers.location || content_url;
  return builds.create(pg_pool,
    app.app_uuid, app.app_name, app.space_name, app.space_tags, app.org_name,
    null, repo, branch, link_url, 'requested-build', sha, content_url, author, message);
}

// public
async function http_github_create_auto_build(pg_pool, req, res, regex) {
  const app_key = http_help.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const data = await http_help.buffer_json(req);

  data.username = data.username || config.default_github_username;
  data.token = data.token || config.default_github_token;

  try {
    assert.ok(data.repo, 'Entity did not contain an "repo" field, which is required');
    assert.ok(data.repo.indexOf('github.com') > -1, 'The "repo" field was not an https://github.com, note ssh is not supported.');
    assert.ok(data.branch, 'Entity did not contain an "branch" field, which is required');
    assert.ok(data.username, 'Entity did not contain an "username" field, which is required');
    assert.ok(data.username.indexOf('@') === -1, 'The github username (not email address) is required.');
    assert.ok(data.token, 'Entity did not contain an "token" field, which is required');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }

  data.status_check = typeof (data.status_check) === 'undefined' ? false : data.status_check;
  data.auto_deploy = typeof (data.auto_deploy) === 'undefined' ? true : data.auto_deploy;

  data.repo = format_git_repo_url(data.repo);
  const created = await create_webhook_if_needed(`${app.app_name}-${app.space_name}`, data.repo, data.token, data.username);
  const { validation_token } = created;
  if (created.existing) {
    throw new common.ConflictError('The specified webhook is already added, remove it on github and resubmit your request.');
  }
  await delete_auto_build(pg_pool, [app.app_uuid]);
  const authorization_uuid = uuid.v4();
  const expires_date = new Date();
  expires_date.setFullYear(3000);
  const enc_token = common.encrypt_token(config.encrypt_key, data.token);
  const autorization_params = [
    authorization_uuid,
    new Date(),
    new Date(),
    'https://github.com',
    '',
    '',
    data.username,
    data.username,
    enc_token,
    expires_date,
    false,
    '',
    false,
  ];
  await insert_authorization(pg_pool, autorization_params);
  await auto_builds.create(
    pg_pool,
    app.app_uuid,
    data.repo,
    data.branch,
    authorization_uuid,
    data.auto_deploy,
    data.status_check,
    'aka',
    validation_token,
  );
  create_build_from_scm(pg_pool, app.app_uuid, data.repo, data.branch, data.token)
    .catch((e) => {
      if (process.env.TEST_MODE) {
        return; // swallow errors during tests since we dont have a valid github token.
      }
      console.error('Failed to generate build while setting repo hook:', e);
    });
  return http_help.created_response(res, '{"status":"successful"}');
}

// private
async function push_webhook_received(pg_pool, app, payload) {
  // https://developer.github.com/v3/activity/events/types/#pushevent
  if (payload.type !== 'push') {
    return;
  }
  const headers = { 'user-agent': 'akkeris-controller-api', 'x-response': 'true' };
  if (!process.env.TEST_MODE) {
    headers.Authorization = `token ${payload.authorization.token}`;
  }
  const response = await http_help.request('get', payload.content_url, headers, null);
  const location_url = response.headers.location || payload.content_url;
  try {
    await builds.create(
      pg_pool,
      app.app_uuid,
      app.app_name,
      app.space_name,
      app.space_tags,
      app.org_name,
      payload.authorization.auto_build,
      payload.repo,
      payload.branch,
      payload.head_commit.url,
      'already-validated-auto-build',
      payload.head_commit.id,
      location_url,
      `${payload.head_commit.author.name} ${payload.head_commit.author.username ? `(${payload.head_commit.author.username})` : ''}`,
      payload.head_commit.message,
    );
    console.log(`build automatically created for ${app.app_name}-${app.space_name}`);
  } catch (err) {
    console.error('Unable to kick off new auto-build:', err);
  }
}

// private
async function should_create_preview_app(pg_pool, app, payload) {
  // only look at pull requests
  if (payload.type !== 'pull_request' || !payload.pull_request) {
    return false;
  }
  // ensure we don't build a new preview app unless new code has arrived, ignore comments,
  // assignments, labels, reviews, title changes, etc.
  if (payload.action !== 'opened' && payload.action !== 'reopened' && payload.action !== 'edited') {
    return false;
  }
  // Ensure an edit action has the same target branch.
  if (payload.action === 'edited' && payload.authorization.branch.toLowerCase() !== payload.branch.toLowerCase()) {
    return false;
  }
  // ensure app is not in socs or prod space
  if (app.space_tags.indexOf('compliance=socs') !== -1 || app.space_tags.indexOf('compliance=prod') !== -1) {
    return false;
  }
  // ensure it has a head reference
  if (!payload.pull_request.head || !payload.pull_request.head.ref || !payload.pull_request.head.repo.full_name) {
    return false;
  }
  // ensure it has a base reference
  if (!payload.pull_request.base || !payload.pull_request.base.ref || !payload.pull_request.base.repo.full_name) {
    return false;
  }
  // ensure the repo is the same, do not create a preview off of public forks.
  if (payload.pull_request.head.repo.full_name !== payload.pull_request.base.repo.full_name) {
    return false;
  }
  if (payload.pull_request.head.repo.id !== payload.pull_request.base.repo.id) {
    return false;
  }
  // check if this is a new pull request
  // or existing commit/sha is already built and preview app exists with that commit sha.
  const existing_apps = (await previews.list(pg_pool, app.app_uuid))
    .filter((papp) => papp.foreign_key.toString() === payload.pull_request.head.ref.toString());
  // if we already have an application with this sha then our existing apps will not be zero
  // we only want to create a new app when one with
  return existing_apps.length === 0 && (await common.feature_enabled(pg_pool, app.app_uuid, 'preview')); // eslint-disable-line
}

// private
async function should_kill_preview_app(pg_pool, app, payload) {
  // only look at pull requests
  if (payload.type !== 'pull_request') {
    return false;
  }
  if (payload.action !== 'closed' && payload.action !== 'edited') {
    return false;
  }
  // Only allow edit to proceed if the base has changed to a new branch.
  if (payload.action === 'edited'
    && (!payload.changes || !payload.changes.base || !payload.changes.base.ref || !payload.changes.base.ref.from
      || payload.authorization.branch.toLowerCase() !== payload.changes.base.ref.from.toLowerCase())) {
    return false;
  }
  // ensure app is not in socs or prod space
  if (app.space_tags.indexOf('compliance=socs') !== -1 || app.space_tags.indexOf('compliance=prod') !== -1) {
    return false;
  }
  // ensure it has a head reference
  if (
    !payload.pull_request || !payload.pull_request.head.ref || !payload.pull_request.head || !payload.pull_request.head.ref
  ) {
    return false;
  }

  // check to see if we receive this on the SOURCE preview, but we will DELETE the TARGET not SOURCE.
  const existing_apps = (await previews.list(pg_pool, app.app_uuid))
    .filter((papp) => papp.foreign_key.toString() === payload.pull_request.head.ref.toString()
    && app.app_uuid === papp.source);

  if (existing_apps.length > 1) {
    console.log('Error: Contact your local maytag man! Unusual use case, there are more than one existing preview apps with this foreign key and target app uuid.', app, existing_apps);
  }

  return existing_apps.length === 1;
}

// private
async function create_preview_build(pg_pool, rec, payload) {
  const preview_app = await common.app_exists(pg_pool, rec.preview.app.id);
  const headers = { 'user-agent': 'akkeris-controller-api', 'x-response': 'true' };
  if (!process.env.TEST_MODE) {
    headers.Authorization = `token ${payload.authorization.token}`;
  }
  const response = await http_help.request('get', payload.content_url, headers, null);
  const location_url = response.headers.location || payload.content_url;

  await builds.create(pg_pool,
    preview_app.app_uuid, preview_app.app_name, preview_app.space_name, preview_app.space_tags, preview_app.org_name,
    payload.authorization.auto_build, payload.repo, payload.source_branch, payload.pull_request.url,
    'already-validated-auto-build', payload.pull_request.head.sha, location_url,
    `${payload.pull_request.user.login}`, payload.pull_request.title);
  console.log(`preview build automatically created for ${preview_app.app_name}-${preview_app.space_name}`);
}

// private
async function pull_request_webhook_received(pg_pool, app, payload) {
  // payload is https://developer.github.com/v3/activity/events/types/#pullrequestevent
  if (await should_kill_preview_app(pg_pool, app, payload)) {
    try {
      const preview_apps = (await previews.list(pg_pool, app.app_uuid)).filter((papp) =>
        // MATCH papp.source to what we received, but we will DELETE papp.target.
        papp.foreign_key.toString() === payload.pull_request.head.ref.toString() && app.app_uuid === papp.source); // eslint-disable-line
      console.log(`Attempting to remove preview app ${preview_apps[0].target}`);
      // DO NOT DELETE app, DELETE THE PREVIEW APP app CREATED. FIRST MAKE SURE
      // THE APP DELETE HAPPENS THEN DELETE THE PREVIEW RECORD.

      // If the app is in the process of being setup then 
      // wait for 5 seconds and try again with a maximum of 12 retries
      for(let i=0; i < 12; i++) {
        try {
          await apps.check_app_delete(pg_pool, {"app_uuid":preview_apps[0].target}, {"tags":app.space_tags, "space_uuid":app.space_uuid});
          break;
        } catch (e) {
          console.log('Warning: waiting to remove preview app', preview_apps[0].target, 'due to', e, 'waiting 5 seconds.');
          await new Promise((res, rej) => setTimeout(res, 5000));
        }
      }
      await apps.delete(pg_pool, preview_apps[0].target);
      await previews.delete_by_target(pg_pool, preview_apps[0].target);
    } catch (e) {
      console.error('Error: failed to remove preview app after PR closed:', e, 'for app', app);
    }
  }
  if (await should_create_preview_app(pg_pool, app, payload)) {
    assert.ok(payload.pull_request.id, 'The pull request id was not present on the incoming payload.');
    assert.ok(payload.pull_request.number, 'The pull request number was not present on the incoming payload.');
    assert.ok(payload.pull_request.head.sha, 'The sha identifier was not present on the incoming payload.');
    assert.ok(payload.pull_request.url, 'The pull request url on the incoming payload was not found.');
    assert.ok(payload.pull_request.head.sha, 'The pull request sha on the incoming payload was not found.');

    try {
      const rec = await previews.create(
        pg_pool,
        app.app_uuid,
        payload.source_branch,
        payload.pull_request.head.sha.substring(0, 5),
        `Created from ${payload.repo} PR #${payload.pull_request.number}`,
      );
      console.log(`Created preview app from ${app.app_uuid} ${app.app_name}-${app.space_name} -> (${rec.preview.app.id}) ${payload.pull_request.head.sha.substring(0, 5)}`);
      await create_preview_build(pg_pool, rec, payload);
    } catch (e) {
      console.error('Error: failed to create preview app after PR opened:');
      console.error(e);
    }
  }
}

// public
async function http_github_webhook_received(pg_pool, req, res, regex) {
  const app_key = http_help.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const payload_buffer = await http_help.buffer(req);
  const payload = JSON.parse(payload_buffer.toString('utf8'));

  // Normalize some common data
  payload.type = req.headers['x-github-event'];
  payload.repo = `https://github.com/${payload.repository ? payload.repository.full_name : ''}`;

  // Validate we have a repository assigned for it, and that we have an authorization that matches the hub signature sent.
  let authorizations = await select_validation_token(pg_pool, [app.app_uuid]);
  authorizations = authorizations.filter((record) => format_git_repo_url(record.repo) === format_git_repo_url(payload.repo)
      && calculate_hash(record.validation_token, payload_buffer) === req.headers['x-hub-signature']);
  if (authorizations.length === 0) {
    throw new common.UnauthorizedError('Unauthorized (bad secret or incorrect repository)');
  }

  // Github may send ping requests to test connections, just respond with a 200.
  if (payload.type === 'ping') {
    return http_help.ok_response(res, 'pong.');
  }

  // ensure this is on the list of event types we care about.
  if (allowed_types.filter((type) => type === payload.type).length === 0) {
    return http_help.reset_response(res, 'This webhook was not an event that were interested in.');
  }
  if ((payload.type === 'push' && !payload.head_commit) || (payload.type === 'pull_request' && (!payload.pull_request.head || !payload.pull_request.base))
  ) {
    return http_help.reset_response(res, 'This webhook was not an event that had any affect.');
  }
  if ((payload.type === 'push' && !payload.ref) || (payload.type === 'pull_request' && !payload.pull_request.base.ref)) {
    return http_help.reset_response(res, 'This webhook was not an event that had any affect.');
  }

  // Validate that the event is targeting the branch on the authorization.
  payload.branch = payload.type === 'push' ? payload.ref.replace(/refs\/heads\//, '') : payload.pull_request.base.ref.replace(/refs\/heads\//, '');
  payload.commit = payload.type === 'push' ? payload.head_commit.id : payload.pull_request.head.sha;
  payload.content_url = `https://api.github.com/repos/${payload.repository.full_name}/zipball/${payload.type === 'pull_request' ? payload.pull_request.head.sha : payload.commit}`;
  payload.authorization = Object.assign(authorizations[0], {
    token: common.decrypt_token(config.encrypt_key, authorizations[0].token),
  });

  if (payload.type === 'push') {
    // During a push event multiple branches may exist that map to either us, or one of our preview apps
    // create a mapping of branches => apps we will accept and see if any of them match, for those that
    // do go ahead and allow them to build, if at the end we processed no records, return an error.
    const built_apps = await Promise.all((await previews.list(pg_pool, app.app_uuid))
      .map((x) => ({ branch: x.foreign_key, app_uuid: x.target }))
      .concat([{ branch: payload.authorization.branch, app_uuid: app.app_uuid }])
      .filter((x) => x.branch.toLowerCase() === payload.branch.toLowerCase())
      .map(async (x) => push_webhook_received(pg_pool, await common.app_exists(pg_pool, x.app_uuid), payload)));

    if (built_apps.length === 0) {
      return http_help.reset_response(res, 'This webhook took place on a branch that isnt of interest.');
    }
  } else if (payload.type === 'pull_request') {
    payload.source_branch = payload.pull_request.head.ref.replace(/refs\/heads\//, '');
    if (payload.action !== 'edited' && payload.authorization.branch.toLowerCase() !== payload.branch.toLowerCase()) {
      return http_help.reset_response(res, 'This webhook took place on a branch that isnt of interest.');
    }
    await pull_request_webhook_received(pg_pool, app, payload);
  }

  common.lifecycle.emit('git-event', app, payload);

  // send ok back,
  return http_help.created_response(res, JSON.stringify({ code: 201, message: 'Roger that, message received.' }));
}

// private
async function add_status(token, org_repo, ref, state, target_url, description) {
  assert.ok(token, 'No token was provided.');
  assert.ok(org_repo, 'No github organization or repository combo was provided');
  assert.ok(ref, 'No sha or reference was provided');
  assert.ok(state, 'No state was provided');
  if (process.env.TEST_MODE) {
    return;
  }
  try {
    await http_help.request('post', `https://api.github.com/repos/${org_repo}/statuses/${ref}`,
      { Authorization: `token ${token}`, 'User-Agent': 'akkeris-controller-api', 'x-silent-error': true },
      JSON.stringify({
        state,
        target_url,
        description,
        context: 'akkeris',
      }));
  } catch (err) {
    console.error(`Warning, updating status failed for ${org_repo} on ref ${ref}`);
    console.error(err);
  }
}

// IMPORTANT: Before modifying this behavior read above about how were semi-misusing github's deployment
// features, this may cause unintended side affects if you modify the behavior of how this works.
async function create_deployment_status(
  token,
  org_repo,
  deployment_id,
  state,
  environment,
  environment_url,
  description,
  log_url,
) {
  assert.ok(token, 'The token was not specified in create_deployment_status.');
  assert.ok(org_repo, 'The organization and repo was not specified in create_deployment_status.');
  assert.ok(deployment_id, 'The deployment_id was not specified in create_deployment_status.');
  assert.ok(state, 'The state was not specified in create_deployment_status.');
  assert.ok(environment, 'The environment was not specified in create_deployment_status.');
  assert.ok(environment_url, 'The environment_url was not specified in create_deployment_status.');
  description = description || `Deployment ${state}`;
  if (process.env.TEST_MODE) {
    return;
  }
  try {
    await http_help.request('post',
      `https://api.github.com/repos/${org_repo}/deployments/${deployment_id}/statuses`,
      {
        'user-agent': 'akkeris-controller-api',
        authorization: `token ${token}`,
        accept: 'application/vnd.github.flash-preview+json',
        'x-silent-error': true,
      },
      JSON.stringify({
        state,
        log_url,
        description,
        environment,
        environment_url,
        auto_inactive: false,
      }));
  } catch (err) {
    console.error(`Warning, updating deployment status failed for ${org_repo} on deployment_id ${deployment_id}`);
    console.error(err);
  }
}


// IMPORTANT: if you're modifying github deployment functionality,
// At the moment we're using github as informational, we do not actually listen to deployment
// events, if we did we'd need to change the behaviour of our code so we didn't get in an accidental
// loop of requesting and creating a deployment.
async function create_deployment(
  token,
  org_repo,
  ref,
  environment,
  payload,
  description,
  transient_environment,
  production_environment,
) {
  assert.ok(token, 'The token was not specified in create_deployment.');
  assert.ok(org_repo, 'The organization and repo was not specified in create_deployment.');
  assert.ok(ref, 'The ref was not specified in create_deployment.');
  assert.ok(environment, 'The environment was not specified in create_deployment.');
  payload = payload || {};
  description = description || `Deploying ${ref}`;
  if (process.env.TEST_MODE) {
    return { id: 1 };
  }
  return JSON.parse(await http_help.request('post',
    `https://api.github.com/repos/${org_repo}/deployments`,
    {
      'user-agent': 'akkeris-controller-api',
      authorization: `token ${token}`,
      accept: 'application/vnd.github.ant-man-preview+json',
      'x-silent-error': true,
    },
    JSON.stringify({
      ref,
      task: 'deploy',
      auto_merge: false,
      required_contexts: [],
      payload,
      environment,
      description,
      transient_environment,
      production_environment,
    })));
}

function map_github_url_to_org_repo(github_url) {
  return format_git_repo_url(github_url).replace(/https:\/\//, '').replace(/http:\/\//, '').split('/')
    .slice(1, 3)
    .join('/');
}

function map_github_state(akkeris_state) {
  switch (akkeris_state) {
    case 'successful':
    case 'succeeded':
      return 'success';
    case 'failed':
    case 'failure':
    case 'error':
      return 'failure';
    default:
      return 'pending';
  }
}

const select_build_scm_metadata = query.bind(query, fs.readFileSync('./sql/select_build_scm_metadata.sql').toString('utf8'), (d) => d);
const update_build_scm_metadata = query.bind(query, fs.readFileSync('./sql/update_build_scm_metadata.sql').toString('utf8'), (d) => d);

async function get_deployments(pg_pool, build_id) {
  const deployments = await select_build_scm_metadata(pg_pool, [build_id]);
  assert.ok(deployments.length === 1, `The build id provided to get_deployments was invalid ${build_id}`);
  if (deployments[0].scm_metadata === null || !deployments[0].scm_metadata || deployments[0].scm_metadata === '') {
    return [];
  }
  return JSON.parse(deployments[0].scm_metadata);
}

async function add_deployment(
  pg_pool,
  build_id,
  environment,
  environment_url,
  org_repo,
  description,
  log_url,
  deployment,
) {
  assert.ok(build_id, 'The build id was not provided to add_deployment');
  assert.ok(environment, 'The environment was not provided to add_deployment');
  assert.ok(environment_url, 'The environment_url was not provided to add_deployment');
  assert.ok(org_repo, 'The org_repo was not provided to add_deployment');
  assert.ok(deployment, 'The deployment was not provided to add_deployment');
  const deployments = (await get_deployments(pg_pool, build_id)).concat([{
    environment, environment_url, org_repo, description, log_url, ...deployment,
  }]);
  return update_build_scm_metadata(pg_pool, [build_id, JSON.stringify(deployments, null, 2)]);
}

async function get_token(pg_pool, app_uuid) {
  // If we're a preview app we need to fetch our authorizaiton from our source app
  let authorizations = await select_validation_token(pg_pool, [app_uuid]);
  const source_app = await previews.source_app(pg_pool, app_uuid);
  if (source_app !== null) {
    authorizations = await select_validation_token(pg_pool, [source_app.app_uuid]);
  }
  if (authorizations.length === 0) {
    return null;
  }
  return common.decrypt_token(config.encrypt_key, authorizations[0].token);
}

// private
async function update_commit_status_for_build(pg_pool, payload) {
  try {
    if (payload.build && payload.build.commit && payload.build.branch) {
      assert.ok(payload.build.id, 'No build id existed on this payload');
      assert.ok(payload.build.result, 'No result was specified on the build payload');
      assert.ok(payload.build.repo, 'No repo was specified on the build payload');
      assert.ok(payload.build.branch, 'No branch was specified on the build payload');
      assert.ok(payload.app.id, 'No app id was specified');
      const org_repo = map_github_url_to_org_repo(payload.build.repo);
      const token = await get_token(pg_pool, payload.app.id);
      if (token === null) {
        // No authorization
        return;
      }
      await add_status(token,
        org_repo,
        payload.build.commit,
        map_github_state(payload.build.result),
        `${config.akkeris_ui_url}/apps/${payload.app.name}-${payload.space.name}/releases`,
        'Image Build');
    }
  } catch (e) {
    console.error(e.message);
    console.error(e.stack);
  }
}

// private
async function create_deployments_for_build(pg_pool, payload) {
  try {
    if (payload.build && payload.build.commit) {
      assert.ok(payload.build, 'No build object existed on this payload');
      assert.ok(payload.build.id, 'No build id was found');
      assert.ok(payload.build.commit, 'No commit was specified on the build payload');
      assert.ok(payload.app.name, 'No app id was found');
      assert.ok(payload.space, 'No space object was found');
      assert.ok(payload.space.name, 'No space name was found');

      const org_repo = map_github_url_to_org_repo(payload.build.repo);
      const app = await common.app_exists(pg_pool, payload.app.id);
      const space = await common.space_exists(pg_pool, payload.space.name);
      const description = 'Deployment pending';
      const environment = `${payload.app.name}-${payload.space.name}`;
      const production_environment = space.tags.indexOf('compliance=prod') > -1;
      // eslint-disable-next-line max-len
      const transient_environment = (await previews.source_app(pg_pool, payload.app.id)) !== null; // This effectively means if we're a preview app.
      const environment_url = app.url;
      const log_url = `${config.akkeris_ui_url}/apps/${payload.app.name}-${payload.space.name}`;
      const token = await get_token(pg_pool, payload.app.id);
      if (token === null) {
        // No authorization
        return;
      }

      const deployment = await create_deployment(
        token,
        org_repo,
        payload.build.commit,
        environment,
        payload,
        description,
        transient_environment,
        production_environment,
      );
      await add_deployment(
        pg_pool,
        payload.build.id,
        environment,
        environment_url,
        org_repo,
        description,
        log_url,
        deployment,
      );
      // Create deployments for all the sites we're in.
      const unique_site_names = (await routes.list(pg_pool, [payload.app.id]))
        .filter((s) => (s.site.preview === null && !transient_environment)
        || (s.site.preview !== null && transient_environment))
        .reduce((acc, val) => ((acc.indexOf(val.site.domain) === -1) ? acc.concat([val.site.domain]) : acc), []);

      await Promise.all(unique_site_names.map(async (site) => {
        const site_deployment = await create_deployment(
          token,
          org_repo,
          payload.build.commit,
          site,
          payload,
          description,
          transient_environment,
          production_environment,
        );
        return add_deployment(
          pg_pool,
          payload.build.id,
          site,
          `https://${site}`,
          org_repo,
          description,
          log_url,
          site_deployment,
        );
      }));
    }
  } catch (e) {
    console.error(e.message);
    console.error(e.stack);
  }
}

// private
async function update_deployments_for_release(pg_pool, payload) {
  try {
    // If this is the release event, and its not the web dyno, don't do anything.
    if (payload.action === 'released' && payload.dyno && payload.dyno.type !== 'web') {
      return;
    }
    if (payload.release && payload.release.id) {
      assert.ok(payload.release, 'No release was found');
      assert.ok(payload.release.id, 'No release id was found');
      assert.ok(payload.app, 'No app object was found');
      assert.ok(payload.app.id, 'No app id was found');
      const deployments = await get_deployments(pg_pool, payload.release.id);
      let state = payload.action === 'released' ? 'success' : 'pending';
      if (payload.action === 'release' && payload.release && payload.release.result && payload.release.result === 'failed') {
        state = 'failure';
      }
      const description = `Deployment ${state}`;
      const token = await get_token(pg_pool, payload.app.id);
      if (token === null) {
        // No authorization
        return;
      }
      await Promise.all(deployments.map(async (deployment) => create_deployment_status(
        token,
        deployment.org_repo,
        deployment.id,
        state,
        deployment.environment,
        deployment.environment_url,
        description,
        deployment.log_url,
      )));
    }
  } catch (e) {
    console.error(e.message);
    console.error(e.stack);
  }
}

function init(pg_pool) {
  common.lifecycle.on('build', update_commit_status_for_build.bind(null, pg_pool));
  common.lifecycle.on('build', create_deployments_for_build.bind(null, pg_pool));
  common.lifecycle.on('released', update_deployments_for_release.bind(null, pg_pool));
}

module.exports = {
  init,
  format_git_repo_url, // exported for testing purposes
  calculate_hash, // exported for testing purposes
  http: {
    webhook: http_github_webhook_received,
    autobuild: {
      get: http_github_get_auto_build,
      delete: http_github_delete_auto_build,
      create: http_github_create_auto_build,
    },
  },
};
