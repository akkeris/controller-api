"use strict";

const crypto = require('crypto');
const fs = require('fs');
const url = require('url');
const uuid = require('uuid');
const common = require('./common.js');
const config = require('./config.js');
const http_help = require('./http_helper.js');
const query = require('./query.js');
const auto_builds = require('./auto_builds.js')

const select_github_validation_token = query.bind(query, fs.readFileSync('./sql/select_validation_token.sql').toString('utf8'), (d) => { return d; });

// public
function github_calculate_hash(secret, data) {
  const hmac = crypto.createHmac('sha1', secret);
  return 'sha1=' + hmac.update(data).digest('hex');
}

async function github_remove_webhook_if_needed(app_key, repo, token) {
  let repo_url = url.parse(http_help.clean_forward_slash(repo))
  // list webhooks
  let alamo_base = config.alamo_app_controller_url;
  let alamo_hook_url = alamo_base + '/apps/' + app_key + '/builds/auto/github';
  let github_hooks_api = 'https://api.github.com/repos' + repo_url.path + '/hooks';
  let github_headers = {'user-agent':'alamo-app-controller', 'authorization':'token ' + token};
  let hooks = await http_help.request('get', github_hooks_api, github_headers, null)
  hooks = JSON.parse(hooks);
  // See if webhook is already set.
  let hook = hooks.filter((hook) => { return hook.config.url === alamo_hook_url; }); 
  if(hook.length !== 0) {
    http_help.request('delete', github_hooks_api + '/' + hook[0].id, github_headers, null).catch((e) => { /* */ })
  }
}

async function github_create_webhook_if_needed(app_key, repo, token) {
  let repo_url = url.parse(http_help.clean_forward_slash(repo));

  // list webhooks
  let alamo_base = config.alamo_app_controller_url;
  let alamo_hook_url = alamo_base + '/apps/' + app_key + '/builds/auto/github';
  let github_hooks_api = 'https://api.github.com/repos' + repo_url.path + '/hooks';
  let github_headers = {'user-agent':'alamo-app-controller', 'authorization':'token ' + token};
  let hooks = await http_help.request('get', github_hooks_api, github_headers, null)
  try {
    hooks = JSON.parse(hooks);
  } catch (e) {
    throw new common.BadRequestError('Malformed JSON response')
  }
  // See if webhook is already set.
  let hook = hooks.filter((hook) => { return hook.config.url === alamo_hook_url; }); 
  if(hook.length !== 0) {
    return {hook:hook[0]}
  } else {
    // create a new one
    let validation_token = uuid.v4();
    let github_webhook_payload = {
      name:'web',
      active:true,
      events:['push'],  // , 'status'
      config:{
        url:alamo_hook_url,
        content_type:'json',
        secret:validation_token
      }
    };
    let hook = await http_help.request('post', github_hooks_api, github_headers, JSON.stringify(github_webhook_payload))
    return {hook, validation_token}
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
  let query_data = await select_github_validation_token(pg_pool, [app.app_uuid])
  if(query_data.length === 0) {
    throw new common.NotFoundError('An auto build was not found for this app.');
  }
  let token = common.decrypt_token(process.env.ENCRYPT_KEY, query_data[0].token);
  await github_remove_webhook_if_needed(`${app.app_name}-${app.space_name}`, query_data[0].repo, token)
  await delete_auto_build(pg_pool, [app.app_uuid])
  return http_help.ok_response(res, '{"status":"successful"}');
}

function format_github_repo_url(repo) {
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
  let hook = created.hook
  let existing = created.existing
  let validation_token = created.validation_token
  if(existing) {
    throw new common.ConflictError('The specified webhook is already added, remove it on github and resubmit your request.');
  }
  await delete_auto_build(pg_pool, [app.app_uuid])
  let authorization_uuid = uuid.v4()
  let expires_date = new Date()
  expires_date.setFullYear(3000)
  let enc_token = common.encrypt_token(process.env.ENCRYPT_KEY, data.token)
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
async function info_github(pg_pool, req, res, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let auto_builds = await select_auto_build(pg_pool, [app.app_uuid])
  if(auto_builds.length === 0) {
    throw new common.NotFoundError('The specified auto build was not found.');
  }
  return http_help.ok_response(res, postgres_to_response(auto_builds[0]));
}

function add_status(status, app_name, space_name, enc_token, repo, sha, description) {
  // if a token (authorization) doesnt exist this should not proceed.
  if(!enc_token) {
    return;
  }
  let app = app_name + '-' + space_name;
  let token = common.decrypt_token(process.env.ENCRYPT_KEY, enc_token);
  let status_url = 'https://api.github.com/repos/' + repo.replace(/https:\/\/github.com\//, '').replace(/https:\/\/www.github.com\//, '') + '/statuses/' + sha;
  let github_headers = {'Authorization':'token ' + token, 'User-Agent':'alamo'};
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
async function github_webhook(pg_pool, req, res, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let payload_buffer = await http_help.buffer(req)
  let payload = JSON.parse(payload_buffer.toString('utf8'))
  if(!req.headers['x-hub-signature'] || req.headers['x-github-event'] !== 'push' || !payload.ref || !payload.head_commit) {
    return http_help.reset_response(res, '')
  }
  // must have a record in auto build for app, with authorization id linked.
  let repo = 'https://github.com/' + payload.repository.full_name;
  let repo_branch = payload.ref.replace(/refs\/heads\//, '');
  let repo_content_url = 'https://api.github.com/repos/' + payload.repository.full_name + '/zipball/' + payload.head_commit.id;
  let query_data = await select_github_validation_token(pg_pool, [app.app_uuid])
  let auto_build_record = query_data.filter((record) => { return record.branch === repo_branch; }).pop();
  if(!auto_build_record || auto_build_record.length === 0) {
    return http_help.reset_response(res, '')
  }
  try {
    console.assert(github_calculate_hash(auto_build_record.validation_token, payload_buffer) === req.headers['x-hub-signature'], 'Unauthorized -- bad secret, signature was: ' + req.headers['x-hub-signature'] + ' payload:' + payload_buffer.toString('base64'));
    console.assert(auto_build_record.repo.toLowerCase().trim().replace('.git','') === repo.toLowerCase().trim().replace('.git',''), 'Invalid repository');
    console.assert((auto_build_record.appname + '-' + auto_build_record.spacename).toString().toLowerCase().trim() === `${app.app_name}-${app.space_name}`, 
      'Invalid application target');
  } catch (e) {
    throw new common.UnauthorizedError('Unauthorized (bad secret tor invalid target)');
  }
  let token = common.decrypt_token(process.env.ENCRYPT_KEY, auto_build_record.token);
  
  // send ok back,
  http_help.created_response(res, JSON.stringify({code:201, message:'Auto build created.'}));

  // Do all of this after the fact.
  let response = await http_help.request('get', repo_content_url, {'Authorization':'token ' + token, 'User-Agent':'alamo', 'x-response':'true'}, null)
  
  console.assert(response.headers['location'], 'Response from repo contents did not contain a redirect');
  // submit a new build.
  try {
    let data = await http_help.request('post', config.alamo_app_controller_url + '/apps/' + app.app_name + '-' + app.space_name + '/builds', {'Authorization':config.simple_key, 'User-Agent':'alamo'}, JSON.stringify({
      org:auto_build_record.org,
      checksum:'already-validated-auto-build',
      url:response.headers['location'],
      repo:repo,
      sha:payload.head_commit.id,
      branch:repo_branch,
      message:payload.head_commit.message,
      author:payload.head_commit.committer ? payload.head_commit.committer.username : '',
      version:payload.head_commit.url,
      auto_build:auto_build_record.auto_build,
      "_skip_checksum":true
    }))
    add_status('pending', auto_build_record.appname, auto_build_record.spacename, auto_build_record.token, repo, payload.head_commit.id, 'Building image.')
    console.log('build automatically created for ' + app.app_name + '-' + app.space_name);
  } catch (err) {
    add_status('error', auto_build_record.appname, auto_build_record.spacename, auto_build_record.token, repo, payload.head_commit.id, 'Image could not be created.')
    console.error("Unable to kick off new auto-build:", err);
  }
}

module.exports = {
  format_github_repo_url,
  info:info_github,
  add_status:add_status,
  calculate_hash:github_calculate_hash, 
  webhook:github_webhook, 
  autobuild:github_auto_build, 
  autobuild_remove:github_remove_auto_build,
  auto_build_check:github_auto_build_check
};