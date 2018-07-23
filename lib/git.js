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
const features = require('./features.js')
const previews = require('./previews.js')
const builds = require('./builds.js')
const apps = require('./apps')

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
  let github_hooks_api = 'https://api.github.com/repos' + repo_url.path + '/hooks';
  let github_headers = {'user-agent':'akkeris-controller-api', 'authorization':'token ' + token, 'x-silent-error':true};
  let hooks = await http_help.request('get', github_hooks_api, github_headers, null)
  hooks = JSON.parse(hooks);
  // See if webhook is already set.
  let hook = hooks.filter((hook) => { return hook.config.url === `${config.alamo_app_controller_url}/apps/${app_key}/builds/auto/github`; }); 
  if(hook.length !== 0) {
    http_help.request('delete', github_hooks_api + '/' + hook[0].id, github_headers, null).catch((e) => { /* do nothing if we fail */ })
  }
}

async function github_create_webhook_if_needed(app_key, repo, token, user) {
  if(process.env.TEST_MODE) {
    return {validation_token:"testing", hook:{"created":true}, existing:(token === 'existing' ? true : false)}
  }
  let repo_url = url.parse(http_help.clean_forward_slash(repo));

  // list webhooks
  let alamo_hook_url = `${config.alamo_app_controller_url}/apps/${app_key}/builds/auto/github`;
  let github_hooks_api = 'https://api.github.com/repos' + repo_url.path + '/hooks';
  let github_headers = {'user-agent':'akkeris-controller-api', 'authorization':'token ' + token, 'x-silent-error':true};
  let hooks = null
  try {
    hooks = await http_help.request('get', github_hooks_api, github_headers, null)
  } catch (e) {
    if (e.code === 404) {
      throw new common.BadRequestError(`The repo ${repo} does not exist or the user ${user} does not have admin permissions to it.`)
    } else {
      throw e
    }
  }
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
    await http_help.request('post', github_hooks_api, github_headers, JSON.stringify(github_webhook_payload))
    return {validation_token, existing:false}
  }
}

async function github_auto_build_check(data) {
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
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let data = await http_help.buffer_json(req)

  data.username = data.username || config.default_github_username
  data.token = data.token || config.default_github_token

  await github_auto_build_check(data)

  data.status_check = typeof(data.status_check) === 'undefined' ? false : data.status_check;
  data.auto_deploy = typeof(data.auto_deploy) === 'undefined' ? true : data.auto_deploy;

  data.repo = format_github_repo_url(data.repo)
  let created = await github_create_webhook_if_needed(`${app.app_name}-${app.space_name}`, data.repo, data.token, data.username)
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
async function github_info(pg_pool, req, res, regex) {
  let app_key = http_help.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let auto_build = await auto_builds.get(pg_pool, app.app_uuid)
  delete auto_build.validation_token
  delete auto_build.authorization
  return http_help.ok_response(res, postgres_to_response(auto_build));
}

function github_add_status(status, app_name, space_name, token, org_repo, sha, description) {
  if(process.env.TEST_MODE) {
    return
  }
  let app = app_name + '-' + space_name;
  let status_url = `https://api.github.com/repos${org_repo}/statuses/${sha}`;
  let github_headers = {'Authorization':`token ${token}`, 'User-Agent':'akkeris-controller-api', 'x-silent-error':true};
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

// IMPORTANT: if you're modifying github deployment functionality,
// At the moment we're using github as informational, we do not actually listen to deployment 
// events, if we did we'd need to change the behaviour of our code so we didn't get in an accidental
// loop of requesting and creating a deployment.
async function create_deployment(app_name, space_name, token, org_repo, ref) {
  console.assert(app_name, 'The app name was not specified in create_deployment.')
  console.assert(space_name, 'The space name was not specified in create_deployment.')
  console.assert(token, 'The token was not specified in create_deployment.')
  console.assert(org_repo, 'The organization and repo was not specified in create_deployment.')
  console.assert(ref, 'The ref was not specified in create_deployment.')
  if(process.env.TEST_MODE) {
    console.log(`    ! Would have created deployment for ${org_repo} on ref ${ref} for app ${app_name}-${space_name}`)
    return {"id":1}
  }
  let github_deployments_api = `https://api.github.com/repos${org_repo}/deployments`;
  let github_headers = {'user-agent':'akkeris-controller-api', 'authorization':`token ${token}`, 'accept': 'application/vnd.github.ant-man-preview+json', 'x-silent-error':true}
  let payload = {
    "ref":ref,
    "task":"deploy",
    "auto_merge":false, 
    "required_contexts":[], 
    "payload":JSON.stringify({"requested_by":"akkeris", "app":`${app_name}-${space_name}`}), 
    "environment":`${app_name}-${space_name}`, 
    "description":`Deploying ${app_name}-${space_name} to preview`, 
    "transient_environment":true, 
    "production_environment":false
  }
  return JSON.parse(await http_help.request('post', github_deployments_api, github_headers, JSON.stringify(payload)))
}
// IMPORTANT: Before modifying this behavior read above about how were semi-misusing githubs deployment
// features, this may cause unintended side affects if you modify the behavior of how this works.
async function create_deployment_status(app_name, space_name, token, org_repo, deployment_id, state, web_url) {
  console.assert(app_name, 'The app name was not specified in create_deployment.')
  console.assert(space_name, 'The space name was not specified in create_deployment.')
  console.assert(token, 'The token was not specified in create_deployment.')
  console.assert(org_repo, 'The organization and repo was not specified in create_deployment.')
  console.assert(deployment_id, 'The deployment_id was not specified in create_deployment.')
  console.assert(state, 'The state was not specified in create_deployment.')
  console.assert(web_url, 'The web_url was not specified in create_deployment.')
  if(process.env.TEST_MODE) {
    console.log(`    ! Would have updated deployment for ${org_repo} on ref ${ref} for app ${app_name}-${space_name} (#${deployment_id}) to ${state} with url ${web_url}`)
    return
  }
  let github_deployment_statuses_api = `https://api.github.com/repos${org_repo}/deployments/${deployment_id}/statuses`;
  let github_headers = {'user-agent':'akkeris-controller-api', 'authorization':`token ${token}`, 'accept': 'application/vnd.github.ant-man-preview+json', 'x-silent-error':true}
  let payload = {
    "state":state,
    "log_url":`${config.appkit_ui_url}/#/apps/${app_name}-${space_name}`,
    "description":`Deployment ${state}`,
    "environment_url":web_url,
    "auto_inactive":true
  }
  return await http_help.request('post', github_deployment_statuses_api, github_headers, JSON.stringify(payload))
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

  // Github may send ping requests to test connections, just respond with a 200.
  if(payload.type === 'ping') {
    return http_help.ok_response(res, 'pong.')
  }

  // ensure this is on the list of event types we care about.
  if(allowed_types.filter((type) => type === payload.type).length === 0) {
    return http_help.reset_response(res, 'This webhook was not an event that were interested in.')
  }
  if(payload.type === 'push' && !payload.head_commit || payload.type === 'pull_request' && (!payload.pull_request.head || !payload.pull_request.base)) {
    return http_help.reset_response(res, 'This webhook was not an event that had any affect.')
  }
  if(payload.type === 'push' && !payload.ref || payload.type === 'pull_request' && !payload.pull_request.base.ref) {
    return http_help.reset_response(res, 'This webhook was not an event that had any affect.')
  }

  // Validate that the event is targeting the branch on the authorization.
  payload.branch = payload.type === 'push' ? payload.ref.replace(/refs\/heads\//, '') : payload.pull_request.base.ref.replace(/refs\/heads\//, '')
  payload.commit = payload.type === 'push' ? payload.head_commit.id : payload.pull_request.head.sha
  payload.content_url = `https://api.github.com/repos/${payload.repository.full_name}/zipball/${payload.type === 'pull_request' ? payload.pull_request.head.sha : payload.commit}`
  payload.authorization = Object.assign(authorizations[0], {token:common.decrypt_token(config.encrypt_key, authorizations[0].token)})

  if(payload.type === 'push') {
    // During a push event multiple branches may exist that map to either us, or one of our preview apps
    // create a mapping of branches => apps we will accept and see if any of them match, for those that
    // do go ahead and allow them to build, if at the end we processed no records, return an error.
    let built_apps = await Promise.all((await previews.list(pg_pool, app.app_uuid))
      .map((x) => { return { branch:x.foreign_key, app_uuid:x.target } })
      .concat([{branch:payload.authorization.branch, app_uuid:app.app_uuid}])
      .filter((x) => x.branch.toLowerCase() === payload.branch.toLowerCase())
      .map(async (x) =>  github_push_webhook_received(pg_pool, await common.app_exists(pg_pool, x.app_uuid), payload)))

    if(built_apps.length === 0) {
      return http_help.reset_response(res, 'This webhook took place on a branch that isnt of interest.')
    }
  } else if(payload.type === 'pull_request') {
    payload.source_branch = payload.pull_request.head.ref.replace(/refs\/heads\//, '')
    if(payload.authorization.branch.toLowerCase() !== payload.branch.toLowerCase()) {
      return http_help.reset_response(res, 'This webhook took place on a branch that isnt of interest.')
    }
    await github_pull_request_webhook_received(pg_pool, app, payload)
  }

  common.lifecycle.emit('git-event', app, payload)

  // send ok back,
  return http_help.created_response(res, JSON.stringify({code:201, message:'Roger that, message received.'}));
}

// private
async function github_push_webhook_received(pg_pool, app, payload) {
  // https://developer.github.com/v3/activity/events/types/#pushevent
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
      'already-validated-auto-build', payload.head_commit.id, url, `${payload.head_commit.author.name} ${payload.head_commit.author.username ? '('+payload.head_commit.author.username+')' : ''}`, payload.head_commit.message)
    console.log(`build automatically created for ${app.app_name}-${app.space_name}`);
  } catch (err) {
    console.error("Unable to kick off new auto-build:", err);
  }
}

// private
async function should_create_preview_app(pg_pool, app, payload) {
  // only look at pull requests
  if(payload.type !== 'pull_request') {
    return false
  }
  // ensure we don't build a new preview app unless new code has arrived, ignore comments, 
  // assignments, labels, reviews, title changes, etc.
  if(payload.action !== 'opened' && payload.action !== 'reopened') {
    return false
  }
  // ensure app is not in socs or prod space
  if(app.space_tags.indexOf('compliance=socs') !== -1 || app.space_tags.indexOf('compliance=prod') !== -1) {
    return false
  }
  // ensure it has a head reference
  if(!payload.pull_request || !payload.pull_request.head.ref || !payload.pull_request.head || !payload.pull_request.head.ref) {
    return false
  }
  // check if this is a new pull request, or existing commit/sha is already built and preview app exists with that commit sha.
  let existing_apps = (await previews.list(pg_pool, app.app_uuid)).filter((papp) => {
    return papp.foreign_key.toString() === payload.pull_request.head.ref.toString() 
  })
  // if we already have an application with this sha then our existing apps will not be zero
  // we only want to create a new app when one with
  return existing_apps.length === 0 && await features.enabled(pg_pool, app.app_uuid, "preview")
}

async function should_kill_preview_app(pg_pool, app, payload) {
  // only look at pull requests
  if(payload.type !== 'pull_request') {
    return false
  }
  if(payload.action !== 'closed') {
    return false
  }
  // ensure app is not in socs or prod space
  if(app.space_tags.indexOf('compliance=socs') !== -1 || app.space_tags.indexOf('compliance=prod') !== -1) {
    return false
  }
  // ensure it has a head reference
  if(!payload.pull_request || !payload.pull_request.head.ref || !payload.pull_request.head || !payload.pull_request.head.ref) {
    return false
  }

  // check to see if we receive this on the SOURCE preview, but we will DELETE the TARGET not SOURCE.
  let existing_apps = (await previews.list(pg_pool, app.app_uuid)).filter((papp) => {
    return papp.foreign_key.toString() === payload.pull_request.head.ref.toString() && app.app_uuid === papp.source
  })

  if(existing_apps.length > 1) {
    console.log("Error: Contact your local maytag man! Unusual use case, there are more than one existing preview apps with this foreign key and target app uuid.", app, existing_apps)
  }

  return existing_apps.length === 1
}

async function github_preview_build_create(pg_pool, rec, payload) {
  let preview_app = await common.app_exists(pg_pool, rec.preview.app.id)
  let headers = {'user-agent':'akkeris-controller-api', 'x-response':'true'}
  if(!process.env.TEST_MODE) {
    headers['Authorization'] = `token ${payload.authorization.token}`
  }
  let response = await http_help.request('get', payload.content_url, headers, null)
  let url = response.headers['location'] || payload.content_url 

  let build = await builds.create(pg_pool, 
    preview_app.app_uuid, preview_app.app_name, preview_app.space_name, preview_app.space_tags, preview_app.org_name, 
    payload.authorization.auto_build, payload.repo, payload.source_branch, payload.pull_request.url, 
    'already-validated-auto-build', payload.pull_request.head.sha, url,
    `${payload.pull_request.user.login}`, payload.pull_request.title)
  console.log(`preview build automatically created for ${preview_app.app_name}-${preview_app.space_name}`)
}

async function github_pull_request_webhook_received(pg_pool, app, payload) {
  // payload is https://developer.github.com/v3/activity/events/types/#pullrequestevent
  if(await should_kill_preview_app(pg_pool, app, payload)) {
    try {
      let preview_apps = (await previews.list(pg_pool, app.app_uuid)).filter((papp) => { 
        // MATCH papp.source to what we received, but we will DELETE papp.target.
        return papp.foreign_key.toString() === payload.pull_request.head.ref.toString() && app.app_uuid === papp.source
      })
      if(process.env.CANARY_MODE) {
        return console.log(`CANARY: We would have deleted ${preview_apps[0].target} based on a PR closing.`);
      }
      console.log(`Removing preview app ${preview_apps[0].target}`)
      // DO NOT DELETE app, DELETE THE PREVIEW APP app CREATED.
      await previews.delete_by_target(pg_pool, preview_apps[0].target)
      await apps.delete(pg_pool, preview_apps[0].target)
    } catch (e) {
      console.error("Error: failed to remove preview app after PR closed:", e, 'for app', app)
    }
  } else if(await should_create_preview_app(pg_pool, app, payload)) {
    console.assert(payload.pull_request.id, 'The pull request id was not present on the incoming payload.')
    console.assert(payload.pull_request.number, 'The pull request number was not present on the incoming payload.')
    console.assert(payload.pull_request.head.sha, 'The sha identifier was not present on the incoming payload.')
    console.assert(payload.pull_request.url, 'The pull request url on the incoming payload was not found.')
    console.assert(payload.pull_request.head.sha, 'The pull request sha on the incoming payload was not found.')

    try {
      let rec = await previews.create(pg_pool, app.app_uuid, payload.source_branch, payload.pull_request.head.sha.substring(0,5), 
        `Created from ${payload.repo} PR #${payload.pull_request.number}`)
      console.log(`Created preview app from ${app.app_uuid} ${app.app_name}-${app.space_name} -> (${rec.preview.app.id}) ${payload.pull_request.head.sha.substring(0,5)}`)
      await github_preview_build_create(pg_pool, rec, payload)
    } catch (e) {
      console.error("Error: failed to create preview app after PR opened:")
      console.error(e)
    }
  }
}

async function github_preview_notification(pg_pool, preview_uuid, app_setup_status, source_app_uuid) {
  try {
    let app = await common.app_exists(pg_pool, app_setup_status.app.id)
    let auth = await select_validation_token(pg_pool, [source_app_uuid])
    let auto_build = await auto_builds.get(pg_pool, app.app_uuid)
    if(auto_build.length === 0) {
      throw new common.NotFoundError('An auto build was not found for this app.');
    }
    let token = common.decrypt_token(config.encrypt_key, auth[0].token);
    let repo_url = url.parse(http_help.clean_forward_slash(auto_build.repo));
    let deployment = await create_deployment(app.app_name, app.space_name, token, repo_url.path, auto_build.branch);
    await previews.update(pg_pool, preview_uuid, deployment.id)
  } catch (e) {
    console.error("Creation of deployment failed:", e)
  }
}

async function notify_release(pg_pool, key, description, auto_release) {
  if(auto_release.token && auto_release.repo && auto_release.sha) {
    try {
      let token = common.decrypt_token(config.encrypt_key, auto_release.token);
      let repo_url = url.parse(http_help.clean_forward_slash(auto_release.repo));
      github_add_status(key, auto_release.app_name, auto_release.space_name, token, repo_url.path, auto_release.sha, description);
    } catch (e) {
      console.log("Unable to update release status:", e)
    }
  } 
  if (auto_release.token && auto_release.repo && auto_release.foreign_status_key) {
    try {
      let token = common.decrypt_token(config.encrypt_key, auto_release.token);
      let repo_url = url.parse(http_help.clean_forward_slash(auto_release.repo));
      return create_deployment_status(auto_release.app_name, auto_release.space_name, token, repo_url.path, auto_release.foreign_status_key, key, auto_release.url)
    } catch (e) {
      console.log("Unable to update deployment status:", e)
    }
  }
}

function init_worker(pg_pool) {
  common.lifecycle.on('release-started', notify_release.bind(null, pg_pool, 'pending', 'Deployment started.'))
  common.lifecycle.on('release-successful', notify_release.bind(null, pg_pool, 'success', 'Deployment successful.'))
  common.lifecycle.on('release-failed', notify_release.bind(null, pg_pool, 'failure', 'Deployment failed.'))
}

function init(pg_pool) {
  common.lifecycle.on('build-status-change', (build_item) => {
    if(build_item.token && build_item.repo && build_item.sha) {
      let token = common.decrypt_token(config.encrypt_key, build_item.token);
      let repo_url = url.parse(http_help.clean_forward_slash(build_item.repo));
      github_add_status(build_item.status === 'succeeded' ?  'success' : 'failure', build_item.name, build_item.space, token, repo_url.path, build_item.sha, 'Image build ' + build_item.status);
    }
  })
  common.lifecycle.on('preview-created', github_preview_notification.bind(null, pg_pool))
}

module.exports = {
  init,
  init_worker,
  format_github_repo_url,
  info:github_info,
  add_status:github_add_status,
  calculate_hash:github_calculate_hash, 
  webhook:github_webhook_received, 
  autobuild:github_auto_build, 
  autobuild_remove:github_remove_auto_build,
}

