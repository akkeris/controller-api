const fs = require('fs')
const common = require('./common.js')
const query = require('./query.js')
const features = require('./features.js')
const uuid = require ('uuid')

let insert_auto_build = query.bind(query, fs.readFileSync('./sql/insert_auto_build.sql').toString('utf8'), (d) => { return d; });

async function create(pg_pool, app_uuid, repo, branch, authorization_uuid, auto_deploy, status_check, agent, validation_token) {
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

module.exports = {
  create
}