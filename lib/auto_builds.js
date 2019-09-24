const fs = require('fs')
const common = require('./common.js')
const query = require('./query.js')
const features = require('./features.js')
const uuid = require ('uuid')

const insert_auto_build = query.bind(query, fs.readFileSync('./sql/insert_auto_build.sql').toString('utf8'), (d) => { return d; });
const select_auto_build = query.bind(query, fs.readFileSync('./sql/select_auto_build.sql').toString('utf8'), (d) => { return d; });
const delete_auto_build = query.bind(query, fs.readFileSync('./sql/delete_auto_build.sql').toString('utf8'), (d) => { return d; });
const update_auto_build = query.bind(query, fs.readFileSync('./sql/update_auto_build.sql').toString('utf8'), (d) => { return d; });
async function del(pg_pool, app_uuid) {
  return await delete_auto_build(pg_pool, [app_uuid])
}

async function create(pg_pool, app_uuid, repo, branch, authorization_uuid, auto_deploy, status_check, agent, validation_token) {
  // check to see if an auto build exists for this app
  try {
    await get(pg_pool, app_uuid)
    await del(pg_pool, app_uuid) // there can be only one.
  } catch (e) {
    // do nothing, allow the insert.
  }
  let auto_build_uuid = uuid.v4()
  let app = await common.app_exists(pg_pool, app_uuid)
  if(auto_deploy === true) {
    await features.update(pg_pool, app.app_uuid, app.app_name, app.space_name, 'auto-release', true)
  } else if (auto_deploy === false) {
    await features.update(pg_pool, app.app_uuid, app.app_name, app.space_name, 'auto-release', false)
  }
  let auto_build_params = [auto_build_uuid, app_uuid, new Date(), new Date(), repo, branch, authorization_uuid, status_check, agent, false, validation_token]
  return await insert_auto_build(pg_pool, auto_build_params)
}

async function get(pg_pool, app_uuid) {
  let auto_builds = await select_auto_build(pg_pool, [app_uuid])
  if(auto_builds.length === 0) {
    if(auto_builds.length > 1) {
      console.error(`ERROR: Multiple valid auto builds were found for the app ${app_uuid}. This should not happen.`)
    }
    throw new common.NotFoundError('The specified auto build was not found.');
  }
  return auto_builds[0]
}

async function copy(pg_pool, src_app_uuid, dst_app_uuid) {
  let auto_build = await get(pg_pool, src_app_uuid)
  return await create(pg_pool, dst_app_uuid, auto_build.repo, auto_build.branch, auto_build.authorization, true, true, 'auto-build-copy', auto_build.validation_token)
}


async function update_branch(pg_pool, app_uuid, branch) {
  await update_auto_build(pg_pool, [app_uuid, branch])
}

module.exports = {
  create,
  copy,
  get,
  update_branch
}