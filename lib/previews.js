const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const apps = require('./apps.js');
const addons = require('./addons.js');
const app_setups = require('./app-setups');
const common = require('./common');
const logs = require('./log-drains');
const routes = require('./routes');
const sites = require('./sites');
const query = require('./query');
const auto_builds = require('./auto_builds.js');
const config = require('./config.js');
const httph = require('./http_helper.js');

const max_subdomain_length = 24;

const insert_preview = query.bind(query, fs.readFileSync('./sql/insert_preview.sql').toString('utf8'), null);
const update_preview = query.bind(query, fs.readFileSync('./sql/update_preview.sql').toString('utf8'), null);
const delete_preview = query.bind(query, fs.readFileSync('./sql/delete_preview.sql').toString('utf8'), null);
const delete_preview_by_target = query.bind(query, fs.readFileSync('./sql/delete_preview_by_target.sql').toString('utf8'), null);
const select_source_app = query.bind(query, fs.readFileSync('./sql/select_source_app.sql').toString('utf8'), null);

async function list(pg_pool, source_app_uuid) {
  return common.preview_apps(pg_pool, source_app_uuid);
}

async function create(pg_pool, source_app_uuid, foreign_key, suffix, additional_info) {
  const src_app = await common.app_exists(pg_pool, source_app_uuid);
  try {
    const definition = await app_setups.definition(pg_pool, source_app_uuid, true);

    if (!definition.formation.web && definition.source_blob && definition.source_blob.url) {
      throw new Error('no existing release or web type formation exists on the source application.');
    } else if (!definition.formation.web) {
      definition.formation = { web: { quantity: 1, size: 'gp1', port: config.default_port } };
    }

    // Disable all preview features on the new preview app, otherwise a pull request to a
    // pull request will cause a preview app on a preview app.  This is getting meta.
    if (definition.features) {
      definition.features = definition.features.map((feature) => {
        if (feature.name === 'preview' || feature.name === 'preview-sites' || feature.name === 'preview-addons' || feature.name === 'preview-dynos') {
          feature.enabled = false;
        }
        return feature;
      });
    }

    // do not allow preview apps to be created in soc spaces
    if (src_app.space_tags.indexOf('compliance=socs') > -1) {
      throw new Error('cannot create preview apps in production or socs controlled spaces.');
    }

    // Search for any config vars that are required, fail if we cannot create
    // one as it was not provided and its required.
    const required_env = Object.keys(definition.env)
      .map((key) => ({ ...definition.env[key], key }))
      .filter((x) => x.required && !x.value);
    if (required_env.length > 0) {
      throw new Error(`One or more config vars are required but could not be found: ${required_env.map((x) => x.key).join(',')}`);
    }

    // Fitler out envs we cant allow
    if (definition.env.PORT) {
      delete definition.env.PORT;
    }

    // This must be set before the rename of the app.
    definition.env.PREVIEW_APP_SOURCE = {
      description: 'The app this preview app was generated from.',
      required: false,
      value: `${definition.app.name}-${definition.app.space}`,
    };

    // Unless were explicitly allowed to,
    // blow away anything other than the web type for formations
    if (await common.feature_enabled(pg_pool, source_app_uuid, 'preview-dynos')) {
      // Reset all of the quantities to 1 so we don't spin up a large amount of
      // resources on accident.
      Object.keys(definition.formation).forEach((x) => {
        definition.formation[x].quantity = 1;
      });
    } else {
      definition.formation = { web: definition.formation.web };
      definition.formation.web.quantity = 1;
    }

    definition['pipeline-couplings'] = [];
    if (definition.source_blob) {
      definition.source_blob.url = null;
    } else {
      definition.source_blob = { url: null };
    }

    // create a unique name with suffix.
    definition.app.name = definition.app.name.substring(0, max_subdomain_length - (suffix.length + 1 + definition.app.space.length)) + suffix; // eslint-disable-line


    definition.env.PREVIEW_APP = {
      description: 'An indicator this app is a preview and the name of the app and space.',
      required: false,
      value: `${definition.app.name}-${definition.app.space}`,
    };

    // double check the unique name.
    let exists = false;
    try {
      await common.app_exists(pg_pool, `${definition.app.name}-${definition.app.space}`);
      exists = true;
    } catch (e) {
      exists = false;
    }

    // bail out, this may have happened by an accidental collision, but not likely.
    if (exists) {
      throw new Error(`a preview app with this name already exists ${definition.app.name}-${definition.app.space}`);
    }

    // unless we have permission to recreate all new addons (e.g., preview-addons is enabled),
    // move all the addons that support sharing to attachments.
    if (!(await common.feature_enabled(pg_pool, source_app_uuid, 'preview-addons'))) {
      definition.addons = {};
      const apps_addons = await addons.list(
        pg_pool, src_app.app_uuid,
        src_app.app_name,
        src_app.space_name,
        src_app.org_name,
      );
      await Promise.all(apps_addons.map(async (addon) => {
        const addon_service = await common.service_by_id_or_name(addon.addon_service.id);
        const service_info = addon_service.info();
        if (service_info.supports_sharing === true) {
          definition.attachments.push({
            app: addon.app.id,
            id: addon.id,
          });
        } else {
          if (definition.addons[addon.addon_service.name]) {
            console.warn(`Error: Creating preview app from ${source_app_uuid} to ${definition.app.name}-${definition.app.space} but an exists twice ${addon.id} (${addon.addon_service.name}`);
          }
          definition.addons[addon.addon_service.name] = { plan: addon.plan.name };
        }
      }));
    }

    // actually create the application using app-setups.
    const app_setup_status = await app_setups.create(pg_pool, definition);

    // record it as a preview application
    const preview_uuid = uuid.v4();
    await insert_preview(pg_pool, [
      preview_uuid,
      app_setup_status.app.id,
      source_app_uuid,
      foreign_key,
      app_setup_status.id,
      additional_info,
    ]);

    const new_sites = [];
    if (await common.feature_enabled(pg_pool, source_app_uuid, 'preview-sites')) {
      // Get a list of sites, that are not preview sites, that the source app is in and then generate a unique list of those.
      const sites_with_source_app = (await routes.list(pg_pool, [source_app_uuid])).filter((s) => s.site.preview === null);
      const unique_site_names = sites_with_source_app.reduce((acc, val) => {
        if (acc.indexOf(val.site.domain === -1)) {
          return acc.concat([val.site.domain]);
        }
        return acc;
      }, []);
      await Promise.all(unique_site_names.map(async (site) => {
        // determine the new name for the site
        const site_to_create = site.split('.').map((x, i) => {
          if (i === 0) {
            return x.substring(0, max_subdomain_length - suffix.length) + suffix;
          }
          return x;
        }).join('.');

        const source_site_info = sites_with_source_app.filter((x) => x.site.domain === site)[0];
        const new_site = await sites.create(pg_pool, source_site_info.site.compliance.indexOf('internal') !== -1, source_site_info.site.region, site_to_create);
        new_sites.push(new_site);
        await sites.enable_preview(pg_pool, new_site.id, preview_uuid);
        const site_routes = await routes.list_by_site(pg_pool, [site]);
        await Promise.all(site_routes.map(async (route) => {
          const target_app_id = source_app_uuid === route.app.id ? app_setup_status.app.id : route.app.id;
          try {
            return await routes.create(pg_pool, new_site.id, target_app_id, route.source_path, route.target_path, true);
          } catch (e) {
            console.error(`Error: unable to create route for site ${new_site.id} and source app ${target_app_id} with path ${route.source_path} to ${route.target_path}`);
            console.error(e.message);
            console.error(e.stack);
          }
          return undefined;
        }));
        const non_pending_routes = site_routes.filter((x) => x.pending !== true);
        // There's no purpose in pushing the routes if they are still in a pending
        // state (all of them that is).
        if (non_pending_routes.length > 0) {
          await routes.push(pg_pool, await common.alamo.region_name_by_space(pg_pool, definition.app.space), site_to_create);
        }
      }));
    }

    // copy auto build info, but no auth
    await auto_builds.copy(pg_pool, source_app_uuid, app_setup_status.app.id);
    await auto_builds.update_branch(pg_pool, app_setup_status.app.id, foreign_key);

    // post event that a preview app has been created.
    common.lifecycle.emit('preview-created', preview_uuid, app_setup_status, source_app_uuid);

    const payload = {
      action: 'preview',
      app: {
        name: src_app.app_name,
        id: src_app.app_uuid,
      },
      space: {
        name: src_app.space_name,
      },
      change: 'create',
      preview: {
        app: {
          name: `${definition.app.name}-${definition.app.space}`,
          id: app_setup_status.app.id,
          url: (await common.determine_app_url(
            pg_pool,
            src_app.space_tags,
            definition.app.name,
            src_app.space_name,
            src_app.org_name,
          )),
        },
        sites: new_sites,
        app_setup: app_setup_status,
      },
    };

    // send a log message to the originating app letting it know we created the preview app.
    logs.event(pg_pool, src_app.app_name, src_app.space_name, `Created preview app ${definition.app.name}-${definition.app.space}`);
    common.notify_hooks(pg_pool, src_app.app_uuid, 'preview', JSON.stringify(payload), 'Preview');
    return payload;
  } catch (e) {
    logs.event(pg_pool, src_app.app_name, src_app.space_name, `Failed to create preview app, ${e.message}`);
    throw e;
  }
}

async function del(pg_pool, preview_uuid) {
  return delete_preview(pg_pool, [preview_uuid]);
}

async function update(pg_pool, preview_uuid, foreign_status_key) {
  return update_preview(pg_pool, [preview_uuid, foreign_status_key]);
}

async function del_by_target(pg_pool, app_uuid) {
  return delete_preview_by_target(pg_pool, [app_uuid]);
}

function to_response(obj) {
  return {
    id: obj.preview,
    app: {
      id: obj.target,
    },
    source: {
      app: {
        id: obj.source,
      },
      'app-setup': {
        id: obj.app_setup,
      },
      trigger: {
        type: 'github-pull-request',
        id: obj.foreign_key,
      },
    },
    created_at: obj.created.toISOString(),
    updated_at: obj.updated.toISOString(),
  };
}

async function http_list(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  return httph.ok_response(res, JSON.stringify((await list(pg_pool, app.app_uuid)).map(to_response)));
}

async function source_app(pg_pool, preview_app_uuid) {
  const preview_app = await select_source_app(pg_pool, [preview_app_uuid]);
  if (preview_app.length === 1) {
    return common.app_exists(pg_pool, preview_app[0].app);
  }
  return null;
}

async function get(pg_pool, app_uuid, preview_uuid) {
  const previews = (await list(pg_pool, app_uuid)).filter((x) => x.preview === preview_uuid);
  if (previews.length !== 1) {
    throw new httph.NotFoundError(`The preview id ${preview_uuid} for app ${app_uuid} was not found.`);
  }
  return previews[0];
}

async function http_get(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const preview_uuid = httph.second_match(req.url, regex);
  const preview = await get(pg_pool, app.app_uuid, preview_uuid);
  return httph.ok_response(res, JSON.stringify(to_response(preview)));
}

// private
const select_old_preview_apps = query.bind(query, fs.readFileSync('./sql/select_old_preview_apps.sql').toString('utf8'), (r) => r);
async function begin_timers(pg_pool) {
  try {
    const old_previews = await select_old_preview_apps(pg_pool, []);
    await Promise.all(old_previews.map(async (papp) => {
      try {
        // Check to make sure app still exists.
        const target_app = await common.app_exists(pg_pool, papp.target);
        assert.ok(target_app.preview, 'The preview app did not have a preview target field.');
        assert.ok(target_app.app_uuid, 'The preview app did not have an app uuid field.');
        assert.ok(
          target_app.space_tags.indexOf('compliance=socs') === -1,
          'We cannot delete an app cleaning up old preview apps that happens to be in a socs space.',
        );
        assert.ok(
          target_app.space_tags.indexOf('compliance=prod') === -1,
          'We cannot delete an app cleaning up old preview apps that happens to be in a prod space.',
        );
        console.log(`Attempting to remove old (5+ days) preview app ${target_app.app_uuid}`);
        await apps.delete(pg_pool, target_app.app_uuid);
        await del_by_target(pg_pool, target_app.app_uuid);
      } catch (err) {
        console.error('Unable to remove old preview app:', err);
      }
    }));
  } catch (err) {
    console.error('Cannot pull or remove old preview apps: ', err);
  } finally {
    setTimeout(() => { begin_timers(pg_pool).catch((e) => { console.error(e); }); }, 1000 * 60 * 60);
  }
}

async function preview_app_released(pg_pool, payload) {
  const target_app = await common.app_exists(pg_pool, payload.key || payload.app.id);
  if (target_app.preview) {
    const p = JSON.parse(JSON.stringify(payload));
    const sapp = await source_app(pg_pool, target_app.app_uuid);
    p.action = 'preview-released';
    p.source_app = { id: sapp.app_uuid, name: sapp.app_name };
    common.lifecycle.emit('preview-released', p);
    common.notify_hooks(pg_pool, p.source_app.id, p.action, JSON.stringify(p), 'System');
  }
}

async function init(pg_pool) {
  common.lifecycle.on('released', preview_app_released.bind(null, pg_pool));
}

module.exports = {
  init,
  list,
  create,
  get,
  delete: del,
  delete_by_target: del_by_target,
  update,
  source_app,
  http: {
    list: http_list,
    get: http_get,
  },
  timers: {
    begin: begin_timers,
  },
};
