const common = require('./common.js')
const httph = require('./http_helper.js')
const query = require('./query.js')
const assert = require('assert')
const fs = require('fs')

const select_build_query = query.bind(query, fs.readFileSync("./sql/select_build_by_foreign_key.sql").toString('utf8'));

async function create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  if(!payload.action || !payload.key) {
    throw new common.BadRequestError()
  }
  let app = await common.app_exists(pg_pool, payload.key)
  payload.app = {
    "name":app.app_name,
    "id":app.app_uuid
  }
  payload.space = {
    "name":app.space_name
  }
  if(payload.action === 'released') {
    if(payload.slug.image && payload.slug.image.indexOf(':0.') !== -1) {
      // Derive the build information from the image app uuid in the name
      // and the apps foriegn key id (tag on docker image :0.[foreign_key])
      let org_app = payload.slug.image.substring(0, payload.slug.image.indexOf(':0.'))
      if(org_app.lastIndexOf('/') !== -1) {
        org_app = org_app.substring(org_app.lastIndexOf('/') + 1)
        if(org_app.indexOf('-') !== -1) {
          org_app = org_app.substring(org_app.indexOf('-') + 1)
          let build_num = payload.slug.image.substring(payload.slug.image.lastIndexOf(':0.') + 3)
          try {
            assert.ok(org_app.length === 36, 'The specified originating app was not a valid uuid.')
            build_num = parseInt(build_num, 10)
            let builds = await select_build_query(pg_pool, [build_num, org_app])
            assert.ok(builds.length === 1, 'The build either did not exist or more than one record found.')
            payload.slug.source_blob = {
              checksum:builds[0].checksum,
              url:'',
              version:builds[0].version,
              commit:builds[0].sha,
              author:builds[0].author,
              repo:builds[0].repo,
              branch:builds[0].branch,
              message:builds[0].message
            }
            payload.slug.id = builds[0].build
          } catch (e) {
            // do nothing
            console.log('Error trying to infer build information for: ', payload)
            console.log(e)
          }
        }
      }
    }
    common.lifecycle.emit('released', payload);
  }
  common.notify_hooks(pg_pool, app.app_uuid, payload.action, JSON.stringify(payload), req.headers['x-username']);
  return httph.ok_response(res, JSON.stringify({"status":"ok"}));
}

module.exports = {
  http:{
    create
  }
}