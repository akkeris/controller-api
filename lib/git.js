"use strict";

const crypto = require('crypto')
const fs = require('fs')
const url = require('url')
const uuid = require('uuid')
const common = require('./common.js')
const config = require('./config.js')
const http_help = require('./http_helper.js')
const query = require('./query.js')
const auto_builds = require('./auto_builds.js')
const builds = require('./builds.js')

const select_validation_token = query.bind(query, fs.readFileSync('./sql/select_validation_token.sql').toString('utf8'), (d) => { return d; });
const allowed_types = ['push', 'pull_request']

// public
function github_calculate_hash(secret, data) {
  const hmac = crypto.createHmac('sha1', secret);
  return 'sha1=' + hmac.update(data).digest('hex');
}

async function github_remove_webhook_if_needed(app_key, repo, token) {
  if(process.env.TEST_MODE) {
    return
  }
  let repo_url = url.parse(http_help.clean_forward_slash(repo))
  // list webhooks
  let github_hooks_api = 'https://api.github.com/repos' + repo_url.path + '/hooks';
  let github_headers = {'user-agent':'akkeris-controller-api', 'authorization':'token ' + token};
  let hooks = await http_help.request('get', github_hooks_api, github_headers, null)
  hooks = JSON.parse(hooks);
  // See if webhook is already set.
  let hook = hooks.filter((hook) => { return hook.config.url === `${config.alamo_app_controller_url}/apps/${app_key}/builds/auto/github`; }); 
  if(hook.length !== 0) {
    http_help.request('delete', github_hooks_api + '/' + hook[0].id, github_headers, null).catch((e) => { /* */ })
  }
}


async function github_create_webhook_if_needed(app_key, repo, token) {
  if(process.env.TEST_MODE) {
    return {validation_token:"testing", hook:{"created":true}, existing:(token === 'existing' ? true : false)}
  }
  let repo_url = url.parse(http_help.clean_forward_slash(repo));

  // list webhooks
  let alamo_hook_url = `${config.alamo_app_controller_url}/apps/${app_key}/builds/auto/github`;
  let github_hooks_api = 'https://api.github.com/repos' + repo_url.path + '/hooks';
  let github_headers = {'user-agent':'akkeris-controller-api', 'authorization':'token ' + token};
  let hooks = await http_help.request('get', github_hooks_api, github_headers, null)
  try {
    hooks = JSON.parse(hooks);
  } catch (e) {
    throw new common.BadRequestError('Malformed JSON response')
  }
  // See if webhook is already set.
  let hook = hooks.filter((hook) => { return hook.config.url === alamo_hook_url; }); 
  if(hook.length !== 0) {
    return {hook:hook[0], existing:true}
  } else {
    // create a new one
    let validation_token = uuid.v4();
    let github_webhook_payload = {
      name:'web',
      active:true,
      events:allowed_types,
      config:{
        url:alamo_hook_url,
        content_type:'json',
        secret:validation_token
      }
    };
    let hook = await http_help.request('post', github_hooks_api, github_headers, JSON.stringify(github_webhook_payload))
    return {validation_token, existing:false}
  }
}

async function github_auto_build_check(pg_pool, req, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let data = await http_help.buffer_json(req)
  try {
    console.assert(data.repo, 'Entity did not contain an "repo" field, which is required');
    console.assert(data.repo.indexOf("github.com") > -1, 'The "repo" field was not an https://github.com, note ssh is not supported.')
    console.assert(data.branch, 'Entity did not contain an "branch" field, which is required');
    console.assert(data.username, 'Entity did not contain an "username" field, which is required');
    console.assert(data.username.indexOf('@') === -1, 'The github username (not email address) is required.');
    console.assert(data.token, 'Entity did not contain an "token" field, which is required');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  data.status_check = typeof(data.status_check) === 'undefined' ? false : data.status_check;
  data.auto_deploy = typeof(data.auto_deploy) === 'undefined' ? true : data.auto_deploy;
  return {data, app}
}

let insert_authorization = query.bind(query, fs.readFileSync('./sql/insert_authorization.sql').toString('utf8'), (d) => { return d; });
let delete_auto_build = query.bind(query, fs.readFileSync('./sql/delete_auto_build.sql').toString('utf8'), (d) => { return d; });

async function github_remove_auto_build(pg_pool, req, res, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let query_data = await select_validation_token(pg_pool, [app.app_uuid])
  if(query_data.length === 0) {
    throw new common.NotFoundError('An auto build was not found for this app.');
  }
  let token = common.decrypt_token(config.encrypt_key, query_data[0].token);
  await github_remove_webhook_if_needed(`${app.app_name}-${app.space_name}`, query_data[0].repo, token)
  await delete_auto_build(pg_pool, [app.app_uuid])
  return http_help.ok_response(res, '{"status":"successful"}');
}

function format_github_repo_url(repo) {
  repo = repo.toLowerCase().trim()
  if(repo.startsWith("git@")) {
    repo = "https://" + repo.substring(4).replace(":", "/")
  }
  if(repo.startsWith("http://")) {
    repo = "https://" + repo.substring(7)
  }
  if(repo.startsWith("https://www.")) {
    repo = "https://" + repo.substring(12)
  }
  if(repo.indexOf('.git') > -1) {
    repo = repo.substring(0, repo.indexOf('.git'))
  }
  repo = http_help.clean_forward_slash(repo)
  return repo
}

async function github_auto_build(pg_pool, req, res, regex) {
  let check = await github_auto_build_check(pg_pool, req, regex)
  let app = check.app;
  let data = check.data;
  data.repo = format_github_repo_url(data.repo)
  let created = await github_create_webhook_if_needed(`${app.app_name}-${app.space_name}`, data.repo, data.token)
  let validation_token = created.validation_token
  if(created.existing) {
    throw new common.ConflictError('The specified webhook is already added, remove it on github and resubmit your request.');
  }
  await delete_auto_build(pg_pool, [app.app_uuid])
  let authorization_uuid = uuid.v4()
  let expires_date = new Date()
  expires_date.setFullYear(3000)
  let enc_token = common.encrypt_token(config.encrypt_key, data.token)
  let autorization_params = [authorization_uuid, new Date(), new Date(), 'https://github.com', '', '', data.username, data.username, enc_token, expires_date, false, '', false]
  await insert_authorization(pg_pool, autorization_params)
  await auto_builds.create(pg_pool, app.app_uuid, data.repo, data.branch, authorization_uuid, data.auto_deploy, data.status_check, 'aka', validation_token)
  return http_help.created_response(res, '{"status":"successful"}')
}

function postgres_to_response(auto_builds) {
  return {
    app:{
      id:auto_builds.app,
      name:auto_builds.appname + '-' + auto_builds.spacename
    },
    auto_deploy:auto_builds.auto_deploy,
    branch:auto_builds.branch,
    created_at:auto_builds.created.toISOString(),
    id:auto_builds.auto_build,
    organization:{
      id:auto_builds.org,
      name:auto_builds.organization
    },
    repo:auto_builds.repo,
    site:auto_builds.site,
    space:{
      id:auto_builds.space,
      name:auto_builds.spacename
    },
    status_check:auto_builds.wait_on_status_checks,
    updated_at:auto_builds.updated.toISOString(),
    username:auto_builds.username,
  }
}

// public
const select_auto_build = query.bind(query, fs.readFileSync('./sql/select_auto_build.sql').toString('utf8'), (d) => { return d; });
async function github_info(pg_pool, req, res, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let auto_builds = await select_auto_build(pg_pool, [app.app_uuid])
  if(auto_builds.length === 0) {
    throw new common.NotFoundError('The specified auto build was not found.');
  }
  return http_help.ok_response(res, postgres_to_response(auto_builds[0]));
}

function github_add_status(status, app_name, space_name, enc_token, repo, sha, description) {
  if(process.env.TEST_MODE) {
    return
  }
  // if a token (authorization) doesnt exist this should not proceed.
  if(!enc_token) {
    return;
  }
  let app = app_name + '-' + space_name;
  let token = common.decrypt_token(config.encrypt_key, enc_token);
  let status_url = 'https://api.github.com/repos/' + repo.replace(/https:\/\/github.com\//, '').replace(/https:\/\/www.github.com\//, '') + '/statuses/' + sha;
  let github_headers = {'Authorization':'token ' + token, 'User-Agent':'akkeris-controller-api'};
  let payload = {
    'state':status, 
    'target_url':`${config.appkit_ui_url}/#/apps/${app}`,
    'description':description,
    'context':'akkeris'
  };
  http_help.request('post', status_url, github_headers, JSON.stringify(payload)).catch((err) => {
    console.error("Warning: cannot post github status for:", status_url, err);
  });
}


// public
async function github_webhook_received(pg_pool, req, res, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let payload_buffer = await http_help.buffer(req)
  let payload = JSON.parse(payload_buffer.toString('utf8'))

  // Normalize some common data
  payload.type = req.headers['x-github-event']
  payload.repo = `https://github.com/${payload.repository ? payload.repository.full_name : ''}`

  // Validate we have a repository assigned for it, and that we have an authorization that matches the hub signature sent. 
  let authorizations = await select_validation_token(pg_pool, [app.app_uuid])
  authorizations = authorizations.filter((record) => {
    return format_github_repo_url(record.repo) === format_github_repo_url(payload.repo) &&
           github_calculate_hash(record.validation_token, payload_buffer) === req.headers['x-hub-signature']
  })
  if(authorizations.length === 0) {
    throw new common.UnauthorizedError('Unauthorized (bad secret or incorrect repository)');
  }
  // ensure this is on the list of event types we care about.
  if(allowed_types.filter((type) => type === payload.type).length === 0) {
    return http_help.reset_response(res, 'This webhook was not an event that were interested in.')
  }

  // Validate that the event is targeting the branch on the authorization.
  payload.branch = payload.type === 'push' ? payload.ref.replace(/refs\/heads\//, '') : payload.pull_request.base.ref.replace(/refs\/heads\//, '')
  payload.authorization = Object.assign(authorizations[0], {token:common.decrypt_token(config.encrypt_key, authorizations[0].token)})
  if(payload.authorization.branch.toLowerCase() !== payload.branch.toLowerCase()) {
    return http_help.reset_response(res, 'This webhook took place on a branch that isnt of interest.')
  }
  if(payload.type === 'push' && !payload.head_commit) {
    return http_help.reset_response(res, 'This webhook was not an event that had any affect.')
  }
  payload.commit = payload.type === 'push' ? payload.head_commit.id : payload.pull_request.head.sha
  payload.content_url = `https://api.github.com/repos/${payload.repository.full_name}/zipball/${payload.commit}`

  common.lifecycle.emit('git-event', app, payload)

  // send ok back,
  http_help.created_response(res, JSON.stringify({code:201, message:'Roger that, message received.'}));
}

// private - https://developer.github.com/v3/activity/events/types/#pushevent
async function github_push_webhook_received(pg_pool, app, payload) {
  if(payload.type !== 'push') {
    return
  }
  let headers = {'user-agent':'akkeris-controller-api', 'x-response':'true'}
  if(!process.env.TEST_MODE) {
    headers['Authorization'] = `token ${payload.authorization.token}`
  }
  let response = await http_help.request('get', payload.content_url, headers, null)
  let url = response.headers['location'] || payload.content_url 
  try {
    await builds.create(pg_pool, app.app_uuid, app.app_name, app.space_name, app.space_tags, app.org_name, payload.authorization.auto_build, payload.repo, payload.branch, payload.head_commit.url, 
      'already-validated-auto-build', payload.head_commit.id, url, `${payload.head_commit.author.name} (${payload.head_commit.author.username})`, payload.head_commit.message)
    console.log(`build automatically created for ${app.app_name}-${app.space_name}`);
  } catch (err) {
    console.error("Unable to kick off new auto-build:", err);
  }
}

// TODO: preview apps - https://developer.github.com/v3/activity/events/types/#pullrequestevent

function init(pg_pool) {
  common.lifecycle.on('release-started', (auto_release) => {
    if(auto_release.token && auto_release.repo && auto_release.sha) {
      github_add_status('pending', auto_release.app_name, auto_release.space_name, auto_release.token, auto_release.repo, auto_release.sha, 'Deployment started.');
    }
  })
  common.lifecycle.on('release-successful', (auto_release) => {
    if(auto_release.token && auto_release.repo && auto_release.sha) {
      github_add_status('success', auto_release.app_name, auto_release.space_name, auto_release.token, auto_release.repo, auto_release.sha, 'Deployment successful.');
    }
  })
  common.lifecycle.on('release-failed', (auto_release) => {
    if(auto_release.token && auto_release.repo && auto_release.sha) {
      github_add_status('failure', auto_release.app_name, auto_release.space_name, auto_release.token, auto_release.repo, auto_release.sha, 'Deployment failed.');
    }
  })
  common.lifecycle.on('build-status-change', (build_item) => {
    if(build_item.token) {
      github_add_status(build_item.status === 'succeeded' ?  'success' : 'failure', build_item.name, build_item.space, build_item.token, build_item.repo, build_item.sha, 'Image build ' + build_item.status);
    }
  })
  common.lifecycle.on('git-event', github_push_webhook_received.bind(null, pg_pool))
}

module.exports = {
  init,
  format_github_repo_url,
  info:github_info,
  add_status:github_add_status,
  calculate_hash:github_calculate_hash, 
  webhook:github_webhook_received, 
  autobuild:github_auto_build, 
  autobuild_remove:github_remove_auto_build,
  auto_build_check:github_auto_build_check
}

