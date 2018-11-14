const fs = require('fs')
const httph = require('./http_helper.js')
const query = require('./query.js')
const common = require('./common.js')

let available_features = [
  {
    "description":"When the application receives a new build whether or not it should automatically release the build.",
    "doc_url":"/features/auto-release",
    "id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
    "state":"public",
    "name":"auto-release",
    "display_name":"Auto release builds",
    "feedback_email":"cobra@octanner.com",
    "enabled":false /* Must always be false! */
  },
  {
    "description":"When a pull request is received, automatically create a preview site and application (web dyno only) with the same config as the development application.",
    "doc_url":"/features/preview",
    "id":"1e4ec5d3-c410-2d04-8d5e-d22346de0112",
    "state":"public",
    "name":"preview",
    "display_name":"Preview Apps",
    "feedback_email":"cobra@octanner.com",
    "enabled":false /* Must always be false! */
  },
  {
    "description":"When a pull request is received and a preview app is created, a preview site (for any sites its a added to) are also created",
    "doc_url":"/features/preview-sites",
    "id":"2e4ec5fa-e410-2d04-8d5e-d22346dedb77",
    "state":"beta",
    "name":"preview-sites",
    "display_name":"Preview Sites",
    "feedback_email":"cobra@octanner.com",
    "enabled":false /* Must always be false! */
  },
  {
    "description":"When a pull request is received and a preview app is created, the addons on the original app are fully recreated rather than attached.",
    "doc_url":"/features/preview-addons",
    "id":"2e8ec5fa-e410-2d04-8d5e-d22346dedb78",
    "state":"beta",
    "name":"preview-addons",
    "display_name":"Preview Addons",
    "feedback_email":"cobra@octanner.com",
    "enabled":false /* Must always be false! */
  },
  {
    "description":"When a pull request is received and a preview app is created, all of the dynos are fully created rather than just the web dyno.",
    "doc_url":"/features/preview-dynos",
    "id":"2e8ec5fa-e410-2d04-8d5e-d22346dedb78",
    "state":"beta",
    "name":"preview-dynos",
    "display_name":"Preview Dynos",
    "feedback_email":"cobra@octanner.com",
    "enabled":false /* Must always be false! */
  },
  {
    "description":"Allow service registration in the format 'space.appname' and interservice communication with distributed tracing",
    "doc_url":"/features/servicemesh",
    "id":"1e4ec5d3-c410-2d04-8d5e-d22346de1111",
    "state":"beta",
    "name":"service-mesh",
    "display_name":"Service Mesh",
    "feedback_email":"cobra@octanner.com",
    "enabled":false /* Must always be false! */
  }
]

function to_response(frecord) {
  let feature = JSON.parse(JSON.stringify(available_features.filter((x) => x.name === frecord.name)))
  feature[0].enabled = frecord.deleted === true ? false : true
  return feature[0]
}

let insert_feature = query.bind(query, fs.readFileSync('./sql/insert_feature.sql').toString('utf8'), to_response)
let delete_feature = query.bind(query, fs.readFileSync('./sql/delete_feature.sql').toString('utf8'), to_response)
let select_features = query.bind(query, fs.readFileSync('./sql/select_features.sql').toString('utf8'), to_response)

async function get_features(pg_pool, app_uuid) {
  let enabled_features = await select_features(pg_pool, [app_uuid])
  let features = JSON.parse(JSON.stringify(available_features)).map((x) => {
    x.enabled = enabled_features.filter(y => y.name === x.name).length !== 0;
    return x;
  })
  return features;
}

async function feature_enabled(pg_pool, app_uuid, feature_key) {
  let features = await select_features(pg_pool, [app_uuid])
  let feature = features.filter((x) => x.name === feature_key)
  if(feature.length === 0) {
    feature = available_features.filter((x) => x.name === feature_key)
  }
  if(feature.length === 0) {
    return false
  }
  return feature[0].enabled
}

async function get_deployment_features(pg_pool, app_uuid, dyno_type) {
  if (dyno_type === 'web') {
    return {
      "serviceMesh": await feature_enabled(pg_pool, app_uuid, "service-mesh")
    }
  } else {
    return {
      "serviceMesh":false
    }
  }
}

async function get_feature(pg_pool, app_uuid, feature_key) {
  let features = await select_features(pg_pool, [app_uuid])
  let feature = features.filter((x) => x.name === feature_key)
  if(feature.length === 0) {
    feature = available_features.filter((x) => x.name === feature_key)
  }
  if(feature.length === 0) {
    throw new common.NotFoundError('The specified feature was not found.')
  }
  return feature[0]
}

async function update_feature(pg_pool, app_uuid, app_name, space_name, feature_key, enabled, user) {
  let proposed_feature = available_features.filter((x) => x.name == feature_key)
  if(proposed_feature.length === 0) {
    throw new common.NotFoundError(`The specified feature ${feature_key} was not found`)
  }

  if(enabled) {
    await insert_feature(pg_pool, [app_uuid, proposed_feature[0].id, proposed_feature[0].name])
  } else {
    await delete_feature(pg_pool, [app_uuid, proposed_feature[0].id])
  }

  let feature = await get_feature(pg_pool, app_uuid, feature_key)

  if(feature.enabled !== enabled) {
    console.error(`ERROR: This should not happen, but the feature ${feature_key} could not be changed to ${enabled} on ${app_uuid} (${feature.enabled})`)
    throw new common.InternalServerError()
  }

  common.notify_hooks(pg_pool, app_uuid, 'feature_change', JSON.stringify({
    'action':'feature_change',
    'app':{
      'name':app_name,
      'id':app_uuid
    },
    'space':{
      'name':space_name
    },
    'changes':[{"type":"update", "name":feature_key, "value":enabled}],
    'feature':feature
  }), user ? user : "System");

  return feature
}

async function http_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let feature_key = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let payload = await httph.buffer_json(req)

  if(!payload || payload.enabled !== true && payload.enabled !== false) {
    throw new common.BadRequestError('The request did not contain an "enabled" key that was a boolean true or false.')
  }

  let feature = await update_feature(pg_pool, app.app_uuid, app.app_name, app.space_name, feature_key, payload.enabled, req.headers['x-username'])

  return httph.ok_response(res, JSON.stringify(feature));
}

async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let feature_key = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let feature = await get_feature(pg_pool, app.app_uuid, feature_key)
  return httph.ok_response(res, JSON.stringify(feature));
}

async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let features = await get_features(pg_pool, app.app_uuid)
  return httph.ok_response(res, JSON.stringify(features))
}

module.exports = {
  http:{
    update:http_update,
    get:http_get,
    list:http_list
  },
  deployment_features:get_deployment_features,
  enabled:feature_enabled,
  list:get_features,
  get:get_features,
  update:update_feature
}
