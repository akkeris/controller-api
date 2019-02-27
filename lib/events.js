const common = require('./common.js')
const httph = require('./http_helper.js')
const query = require('./query.js')
const assert = require('assert')
const fs = require('fs')
const logs = require('./log-drains.js');

const select_build_by_foreign_key = query.bind(query, fs.readFileSync("./sql/select_build_by_foreign_key.sql").toString('utf8'), (r) => { return r });
const select_latest_release_by_app = query.bind(query, fs.readFileSync("./sql/select_latest_release_by_app.sql").toString('utf8'), (r) => { return r });

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
            let builds = await select_build_by_foreign_key(pg_pool, [build_num, org_app])
            assert.ok(builds.length === 1, 'The build either did not exist or more than one record found.')

            let release = await select_latest_release_by_app(pg_pool, [payload.app.id])
            if(release && release.length > 0 && release[0].build === builds[0].build) {
              payload.release = {
                id:release[0].release,
                created_at:release[0].created.toISOString(),
                updated_at:release[0].updated.toISOString(),
                version:release[0].version
              }
            } else {
              console.warn("Unable to find release for: ", payload)
            }
            
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
    logs.event(pg_pool, app.app_name, app.space_name, payload.release && payload.release.version ? `Release v${payload.release.version} finished.` : "Release finished");
    common.lifecycle.emit('released', payload);
  } else if (payload.action === 'crashed') {
    logs.event(pg_pool, app.app_name, app.space_name, `at=error dynos="${Array.isArray(payload.dynos) ? payload.dynos.map(x => x.type).join(",") : "unknown"}" code=${payload.code} desc="${payload.description}" restarts=${payload.restarts}`);
  }
  common.notify_hooks(pg_pool, app.app_uuid, payload.action, JSON.stringify(payload), req.headers['x-username']);
  return httph.ok_response(res, JSON.stringify({"status":"ok"}));
}

module.exports = {
  http:{
    create
  }
}