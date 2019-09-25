const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const httph = require('./http_helper.js');
const addons = require('./addons.js')
const addon_attachments = require('./addon-attachments.js')
const builds = require('./builds.js')
const config = require('./config.js')
const config_vars = require('./config-var.js')
const common = require('./common.js')
const formation = require('./formations.js')
const features = require('./features.js')
const logs = require('./log-drains')
const query = require('./query.js')
const routes = require('./routes.js')
const sites = require('./sites.js')

// private
function app_payload_to_response(payload) {
  return {
    "archived_at":payload.created.toISOString(),
    "buildpack_provided_description": "default",
    "build_stack": {
      "id":payload.stack_uuid,
      "name":payload.stack_name
    },
    "created_at":payload.created.toISOString(),
    "description":payload.description,
    "git_url":payload.repo,
    "git_branch":payload.repo_branch,
    "id":payload.id,
    "labels":payload.labels,
    "maintenance":payload.disabled ? true : false,
    "name":payload.app_key,
    "simple_name":payload.simple_name,
    "key":payload.app_key,
    "owner":{
      "email":"",
      "id":uuid.unparse(crypto.createHash('sha256').update(payload.org_name).digest(), 16)
    },
    "organization": {
      "id":payload.org_uuid,
      "name":payload.org_name
    },
    "formation":{
      "size":payload.size,
      "quantity":payload.instances,
      "port":payload.port
    },
    "preview": payload.preview ? {
      "id": payload.preview
    } : null,
    "region":{
      "id":payload.region_uuid,
      "name":payload.region_name
    },
    "released_at":payload.released ? payload.released.toISOString() : null,
    "repo_size":0,
    "slug_size":0,
    "space":{
      "id":payload.space_uuid,
      "name":payload.space_name,
      "compliance":payload.space_tags
    },
    "stack":{
      "id":payload.stack_uuid,
      "name":payload.stack_name
    },
    "updated_at":payload.modified.toISOString(),
    "web_url":payload.url
  };
}

// private
function app_postgres_to_response(result) {
  result.app_key = result.app_name + '-' + result.space_name;
  result.simple_name = result.app_name;
  result.id = result.app_uuid;
  result.modified = result.updated;
  return app_payload_to_response(result);
}

// private
function check_payload(payload) {
  assert.ok(payload.name && /(^[A-Za-z0-9]+$)/.exec(payload.name) !== null, "The application name was invalid or missing, it cannot contain dashes or other special characters." );
  assert.ok(payload.space && /(^[A-z0-9\-]+$)/.exec(payload.space) !== null, "The application space field was not specified"); 
  assert.ok(payload.org, "The application org field was not specified");
  assert.ok((payload.name + "-" + payload.space).length < 25, "The application name was too long, the app space and name must be less than 24 characters.");
}

// private
let insert_app = query.bind(query, fs.readFileSync("./sql/insert_app.sql").toString('utf8'), null);

// private
const select_app_setup_by_app = query.bind(query, fs.readFileSync('./sql/select_app_setup_by_app.sql').toString('utf8'), null);
const select_apps_query = fs.readFileSync("./sql/select_apps.sql").toString('utf8');
let select_apps = query.bind(query, select_apps_query, app_postgres_to_response);

// private
const select_app_query = fs.readFileSync("./sql/select_app.sql").toString('utf8');
let select_app = query.bind(query, select_app_query, app_postgres_to_response);

// private
let update_app = query.bind(query, fs.readFileSync("./sql/update_app.sql").toString('utf8'), (r) => { return r; });
let update_app_info = query.bind(query, fs.readFileSync("./sql/update_app_info.sql").toString('utf8'), (r) => { return r; });

const delete_app_query = fs.readFileSync("./sql/delete_app.sql").toString("utf8");
let delete_app = query.bind(query, delete_app_query, () => {});

const delete_services_by_app_query = fs.readFileSync("./sql/delete_services_by_app.sql").toString("utf8");
let delete_services_by_app = query.bind(query, delete_services_by_app_query, () => {});

// private
function app_payload_to_postgres(payload) {
  return [payload.id, payload.created, payload.modified, payload.name, payload.space_uuid, payload.org_uuid, payload.url, payload.description, payload.labels];
}

// public 
async function update(pg_pool, app_key, name, maintenance, description, labels) {
  let app = await common.app_exists(pg_pool, app_key);
  let space = await common.space_exists(pg_pool, app.space_name);
  if(name && name !== app.app_name) {
    throw new common.BadRequestError("Renaming apps is currently not supported")
  }

  // Update app description and labels (if provided)
  if (description !== app.description || labels !== app.labels) {
    app.description = description || app.description;
    app.labels = labels || app.labels;
    await update_app_info(pg_pool, [app.app_uuid, app.description, app.labels]);
  }

  if (typeof(maintenance) !== 'boolean' || app.disabled === maintenance) {
    return app;
  }
  
  app.disabled = app.maintenance = maintenance;

  let errors = false;
  await Promise.all((await common.formations_exists(pg_pool, app.app_uuid)).map(async (dyno_type) => {
    try {
      await common.alamo.dyno.scale(pg_pool, app.app_name, app.space_name, dyno_type.type, app.maintenance === true ? 0 : dyno_type.quantity);
    } catch (err) {
      errors = true;
      console.error(`Error while updating app ${app.app_name}-${app.space_name}`, err);
    }
  }))

  await update_app(pg_pool, [app.app_uuid, app.maintenance]);

  let maintresult = await common.alamo.apps.maintenance_page(pg_pool, app.space_name, app.app_name, app.maintenance)
  if (!(maintresult.status > 199 && maintresult.status < 300)) {
    console.error(`Error while updating app, failed to put in maintenance mode: ${JSON.stringify(maintresult, null, 2)}`)
    errors = true;
  } 
  logs.event(pg_pool, app.app_name, app.space_name, "Placing app " + (app.maintenance === true ? "into" : "out of") + " maintenance mode.");
  if(errors) {
    throw new common.ServiceUnavailableError('Unable to set maintenace mode')
  }
  return app;
}

// public
async function create(pg_pool, org_key, space_key, app_name, description, labels) {
  app_name = app_name.toLowerCase().trim()
  space_key = space_key.toLowerCase().trim()

  // TODO: Include space configuration set into the app.
  let organization = await common.org_exists(pg_pool, org_key)
  let space = await common.space_exists(pg_pool, space_key)
  let app_key = `${app_name}-${space.name}`
  let app_found = false;
  description = description || "";
  labels = labels || "";
  try {
    await common.app_exists(pg_pool, app_key);
    app_found = true;
  } catch (e) {
    // do nothing, we were hoping the app did not exist.
  }
  if(app_found) {
    throw new common.ConflictError("The requested application already exists.");
  }
  // determine the url for the application depending on its compliance.
  let id          = uuid.v4();
  let created     = new Date();
  let url         = await common.determine_app_url(pg_pool, space.tags, app_name, space.name, organization.name);
  // create config set in alamo
  await common.alamo.config.set.create(pg_pool, app_name, space.name)
  // add the default port.
  await common.alamo.config.add(pg_pool, app_name, space.name, 'PORT', config.default_port);
  // create db record, the actual app isn't created until a formation call is made.
  let db_record = await insert_app(pg_pool, app_payload_to_postgres({id, created, modified:created, name:app_name, space_uuid:space.space, org_uuid:organization.org, url, description, labels}));
  // enable auto-release
  await features.update(pg_pool, id, app_name, space.name, 'auto-release', true)
  let payload = {
    created,
    repo:null,
    repo_branch:null,
    id,
    app_uuid:id,
    disabled:false,
    app_key,
    app_name,
    description,
    labels,
    simple_name:app_name,
    org_uuid:organization.org,
    org_name:organization.name,
    size:null,
    instances:null,
    port:null,
    released:null,
    stack_uuid:space.stack_uuid,
    stack_name:space.stack_name,
    region_uuid:space.region_uuid,
    region_name:space.region_name,
    space_uuid:space.space,
    space_name:space.name,
    modified:created, 
    url,
    space_tags:space.tags
  };
  return app_payload_to_response(payload); 
}

// private
async function check_app_delete(pg_pool, app, space, elevated_access) {
  if(!elevated_access && (space.tags.indexOf('compliance=socs') > -1 || space.tags.indexOf('compliance=prod') > -1) ) {
    throw new common.NotAllowedError("This application can only be deleted by administrators.");
  }

  // Ensure an app-setup for this app is not in progress,
  // otherwise we could potentially get into some bizarre situations as
  // we internally remove it while its half created.
  let app_setups = await select_app_setup_by_app(pg_pool, [app.app_uuid]);
  if (app_setups.filter((x) => x.status === 'pending').length > 0) {
    throw new common.ConflictError('This app cannot be removed as it is still being created by an app-setup process.');
  }
}

// private
async function remove_dependent_preview_apps(pg_pool, app, space, elevated_access) {
  let preview_apps = await common.preview_apps(pg_pool, app.app_uuid);
  await Promise.all(preview_apps.map(async (preview_app) => {
    if(app.app_uuid === preview_app.source) {
      try {
        return await del(pg_pool, preview_app.target, elevated_access);
      } catch (e) {
        console.warn(`Error: Unable to remove preview app: ${preview_app.target} while trying to remove source app ${app.app_uuid}`);
        console.warn(e);
      }
    } else {
      console.warn("Associated preview app had some inconsistencies, not removing.", preview_app);
    }
  }))
}

// private
async function remove_log_drains(pg_pool, app, space) {
  try {
    await logs.delete_all_drains(pg_pool, app.app_uuid, app.app_name, space.name, app.org_uuid);
  } catch (e) {
    console.log(`Warning: unable to remove log drains for app ${app.app_uuid}`);
    console.warn(e);
  }
}

// private
async function remove_routes(pg_pool, app_uuid) {
  try {
    await routes.delete_by_app(pg_pool, app_uuid);
  } catch (e) {
    console.warn(`Warning: unable to remove routes for app ${app_uuid}`);
    console.warn(e);
  }
}

// private
async function remove_preview_sites(pg_pool, app_uuid) {
  try {
    await sites.remove_previews(pg_pool, app_uuid);
  } catch (e) {
    console.warn(`Warning: unable to remove preview sites for app ${app_uuid}`);
    console.warn(e);
  }
}

// private
async function remove_pending_build_jobs(pg_pool, app_name, app_uuid) {
  try {
    await builds.delete_job_if_exists(pg_pool, app_name, app_uuid);
  } catch (e) {
    console.warn(`Warning: unable to remove build job for app ${app_uuid}`);
    console.warn(e);
  }
}

// public
async function del(pg_pool, app_key, elevated_access, user) {
  let app = await common.app_exists(pg_pool, app_key);
  let space = await common.space_exists(pg_pool, app.space_name);

  await check_app_delete(pg_pool, app, space, elevated_access);

  // if we happen to have any preview apps, delete them as well.
  await remove_dependent_preview_apps(pg_pool, app, space, elevated_access);

  // This must be below the preview app deletion so we don't include preview apps
  // in deciding if we should remove the applicaiton.
  if(!await addons.can_remove_addons_by_app(pg_pool, app.app_uuid)) {
    throw new common.ConflictError("This app cannot be removed as it has addons that are attached to another app.")
  }

  // addons should always be removed first, they can potentially remove other 
  // properties and/or drains/etc so we don't want its dependents to be removed before it.
  await addons.delete_by_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_uuid);
  
  // async remove for log drains
  await remove_log_drains(pg_pool, app, space);

  // async remove routes
  await remove_routes(pg_pool, app.app_uuid);

  // if we happen to be a preview app, and we have sites which were created for our preview, remove them.
  await remove_preview_sites(pg_pool, app.app_uuid);

  // remove job if it exists.
  await remove_pending_build_jobs(pg_pool, app.app_name, app.app_uuid);

  // remove config set
  let config_set = await common.alamo.config.set.delete(pg_pool, app.app_name, app.space_name);

  // remove physical dynos and real apps
  await formation.delete_dynos(pg_pool, app.app_uuid, app.app_name, app.space_name);

  // Remove app services from regional api
  await delete_app(pg_pool, [app.app_uuid]);

  // Remove build jobs, we don't care about the result, this may error our, but its not necessarily
  // a bad thing, our build jobs may not exist if the user did not perform a build.
  logs.event(pg_pool, app.app_name, app.space_name, "Deleting");

  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'destroy', JSON.stringify({
      'action':'destroy',
      'app':{
        'name':app.app_name,
        'id':app.app_uuid
      },
      'space':{
        'name':app.space_name
      }
    }), user ? user : "System");
  }, 10);
  return app;
}

// public
async function http_list (pg_pool, req, res, regex) {
  let apps = await select_apps(pg_pool, []);
  return httph.ok_response(res, JSON.stringify(apps));
}

// public
async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let appresp = app_postgres_to_response(app)
  try {
    let appd = await common.alamo.app_describe(pg_pool, `${app.app_name}-${app.space_name}`)
    appresp.image = appd.image
  } catch (e) {
    // If there have been no deployments this will
    // throw an error, go ahead and absorb it and set the image to null
    appresp.image = null
  }
  return httph.ok_response(res, JSON.stringify(appresp))
}

// public
async function http_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  try {
    check_payload(payload)
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  return httph.created_response(res, await create(pg_pool, payload.org, payload.space, payload.name, payload.description, payload.labels))
}

// public
async function http_delete (pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await del(pg_pool, app_key, req.headers['x-elevated-access'] === 'true' && req.headers['x-username'], req.headers['x-username']);
  return httph.ok_response(res, JSON.stringify({
    "id":app.app_uuid,
    "name":`${app.app_name}-${app.space_name}`, 
    "org":app.org_name, 
    "result":"successful"
  }));
}

// public
async function http_update (pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let payload = await httph.buffer_json(req)
  let app = await update(pg_pool, app_key, payload.name, payload.maintenance, payload.description, payload.labels)
  return httph.ok_response(res, JSON.stringify(app_postgres_to_response(app)));
}

module.exports = {
  http:{
    list:http_list,
    get:http_get,
    create:http_create,
    delete:http_delete,
    update:http_update,
  },
  list:select_apps,
  get:common.app_exists,
  create,
  delete:del,
  update,
  check_payload
};
