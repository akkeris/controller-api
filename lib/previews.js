
const addon_services = require('./addon-services.js')
const app_setups = require('./app-setups')
const common = require('./common')
const logs = require('./log-drains')
const routes = require('./routes')
const sites = require('./sites')
const query = require('./query')
const auto_builds = require('./auto_builds.js')
const fs = require('fs')
const uuid = require('uuid')
const httph = require('./http_helper.js')
const max_subdomain_length = 24

let insert_preview = query.bind(query, fs.readFileSync("./sql/insert_preview.sql").toString('utf8'), null);
let update_preview = query.bind(query, fs.readFileSync("./sql/update_preview.sql").toString('utf8'), null);
let delete_preview = query.bind(query, fs.readFileSync("./sql/delete_preview.sql").toString('utf8'), null);
let delete_preview_by_target = query.bind(query, fs.readFileSync("./sql/delete_preview_by_target.sql").toString('utf8'), null);

async function list(pg_pool, source_app_uuid) {
  return common.preview_apps(pg_pool, source_app_uuid)
}

async function create(pg_pool, source_app_uuid, foreign_key, suffix, additional_info) {
  let source_app = await common.app_exists(pg_pool, source_app_uuid)
  try {
    let definition = await app_setups.definition(pg_pool, source_app_uuid)

    // search for any config vars that are required.  fail if we have one marked secret/required
    if(Object.keys(definition.env).map((x) => definition.env[x]).filter((x) => x.required ).length > 0) {
      // we cannot create an app with redacted or required keys.
      throw new Error(`cannot create preview apps in production or socs controlled spaces.`)
    }

    // blow away anything other than the web type for formations
    if(!definition.formation.web) {
      throw new Error(`no existing release or web type formation exists on the source application.`)
    }
    definition.formation = {web:definition.formation.web}
    definition.formation.web.quantity = 1
    definition['pipeline-couplings'] = []
    definition.source_blob.url = null

    // create a unique name with suffix.
    definition.app.name = definition.app.name.substring(0, max_subdomain_length - (suffix.length + 1 + definition.app.space.length)) + suffix
    // double check the unique name.
    let exists = false
    try {
      await common.app_exists(pg_pool, `${definition.app.name}-${definition.app.space}`)
      exists = true
    } catch (e) {
      exists = false
    }

    // bail out, this may have happened by an accidental collision, but not likely. 
    if(exists) {
      throw new Error(`a preview app with this name already exists ${definition.app.name}-${definition.app.space}`)
    }
    // move all the addons to attachments.  anything that cannot be attached, must be created
    definition.addons = {}
    let addons = await addon_services.addons.list(pg_pool, source_app.app_uuid, source_app.app_name, source_app.space_name, source_app.org_name)
    // any addons which cannot be attached, recreate as addons
    await Promise.all(addons.map(async (addon) => { 
      let addon_service = await addon_services.addon_by_id_or_name(addon.addon_service.id)
      let service_info = addon_service.info()

      if(service_info.supports_sharing === true) {
        definition.attachments.push({
          "app":addon.app.id,
          "id":addon.id 
        })
      } else {
        if(definition.addons[addon.addon_service.name]) {
          console.warn(`Error: Creating preview app from ${source_app_uuid} to ${definition.app.name}-${definition.app.space} but an exists twice ${addon.id} (${addon.addon_service.name}`)
        }
        definition.addons[addon.addon_service.name] = {plan:addon.plan.name}
      }
    }))

    // actually create the application using app-setups.
    let app_setup_status = await app_setups.create(pg_pool, definition)

    // record it as a preview application
    let preview_uuid = uuid.v4()
    await insert_preview(pg_pool, [preview_uuid, app_setup_status.app.id, source_app_uuid, foreign_key, app_setup_status.id, additional_info])


    // create new preview sites
    let new_sites = []
    let sites_with_source_app = (await routes.list(pg_pool, [source_app_uuid]));
    let unique_site_names = sites_with_source_app.reduce((acc, val) => ((acc.indexOf(val.site.domain) === -1) ? acc.concat([val.site.domain]) : acc), []);
    let site_definitions = await Promise.all(unique_site_names.map(async (site) => {
      // determine the new name for the site
      let site_to_create = site.split('.').map((x, i) => {
        if(i === 0) 
          return x.substring(0, max_subdomain_length - suffix.length) + suffix
        else
          return x 
      }).join('.')
      
      let source_site_info = sites_with_source_app.filter((x) => x.site.domain === site)[0]
      let new_site = await sites.create(pg_pool, source_site_info.site.compliance.indexOf('internal') !== -1, source_site_info.site.region, site_to_create)
      new_sites.push(new_site)
      await sites.enable_preview(pg_pool, new_site.id, preview_uuid)
      await Promise.all((await routes.list_by_site(pg_pool, [site])).map(async (route) => {
        return routes.create(pg_pool, new_site.id, source_app_uuid === route.app.id ? app_setup_status.app.id : route.app.id, route.source_path, route.target_path)
      }))
    }))

    // copy auto build info, but no auth
    await auto_builds.copy(pg_pool, source_app_uuid, app_setup_status.app.id)
    await auto_builds.update_branch(pg_pool, app_setup_status.app.id, foreign_key)

    // post event that a preview app has been created.
    common.lifecycle.emit('preview-created', preview_uuid, app_setup_status, source_app_uuid)

    let payload = {
      'action':'preview',
      'app':{
        'name':source_app.app_name,
        'id':source_app.app_uuid
      },
      'space':{
        'name':source_app.space_name
      },
      'change':'create',
      'preview':{
        'app':{
          'name':`${definition.app.name}-${definition.app.space}`,
          'id':app_setup_status.app.id,
          'url':(await common.determine_app_url(pg_pool, source_app.space_tags, definition.app.name, source_app.space_name, source_app.org_name))
        },
        'sites':new_sites,
        'app_setup':app_setup_status
      }
    };

    // send a log message to the originating app letting it know we created the preview app.
    logs.event(source_app.app_name, source_app.space_name, `Created preview app ${definition.app.name}-${definition.app.space}`)
    common.notify_hooks(pg_pool, source_app.app_uuid, 'preview', JSON.stringify(payload), "Preview");
    return payload
  } catch (e) {
    logs.event(source_app.app_name, source_app.space_name, `Failed to create preview app, ${e.message}`)
    throw e
  }
}

async function del(pg_pool, preview_uuid) {
  return await delete_preview(pg_pool, [preview_uuid])
}

async function update(pg_pool, preview_uuid, foreign_status_key) {
  return await update_preview(pg_pool, [preview_uuid, foreign_status_key])
}

async function del_by_target(pg_pool, app_uuid) {
  return await delete_preview_by_target(pg_pool, [app_uuid])
}

function to_response(obj) {
  return {
    "id":obj.preview,
    "app":{
      "id":obj.target
    },
    "source":{
      "app":{
        "id":obj.source
      },
      "app-setup":{
        "id":obj.app_setup
      },
      "trigger":{
        "type":"github-pull-request",
        "id":obj.foreign_key
      }
    },
    "created_at":obj.created.toISOString(),
    "updated_at":obj.updated.toISOString()
  }
}

async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  return httph.ok_response(res, JSON.stringify((await list(pg_pool, app.app_uuid)).map(to_response)))
}

async function get(pg_pool, app_uuid, preview_uuid) {
  let previews = (await list(pg_pool, app_uuid)).filter((x) => x.preview === preview_uuid)
  if(previews.length !== 1) {
    throw new httph.NotFoundError(`The preview id ${preview_uuid} for app ${app_uuid} was not found.`)
  }
  return previews[0]
}

async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let preview_uuid = httph.second_match(req.url, regex)
  let preview = await get(pg_pool, app.app_uuid, preview_uuid)
  return httph.ok_response(res, JSON.stringify(to_response(preview)))
}

module.exports = {
  list,
  create,
  get,
  delete:del,
  delete_by_target:del_by_target,
  update,
  http:{
    list:http_list,
    get:http_get
  }
}