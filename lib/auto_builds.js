const fs = require('fs')
const query = require('./query.js')
const uuid = require ('uuid')

let insert_auto_build = query.bind(query, fs.readFileSync('./sql/insert_auto_build.sql').toString('utf8'), (d) => { return d; });

async function create(pg_pool, app_uuid, repo, branch, authorization_uuid, auto_deploy, status_check, agent, validation_token) {
  let auto_build_uuid = uuid.v4()
  let auto_build_params = [auto_build_uuid, app_uuid, new Date(), new Date(), repo, branch, authorization_uuid, auto_deploy, status_check, agent, false, validation_token]
  return await insert_auto_build(pg_pool, auto_build_params)
}

module.exports = {
  create
}