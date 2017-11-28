"use strict";

const fs = require('fs');
const url = require('url');
const http = require('http');
const pg = require('pg');
const query = require('./lib/query.js');
const config = require('./lib/config.js');
const octhc = require('./lib/octhc.js');
const routes = require('./lib/router.js');
const simple_key_auth = require('./lib/simple_key_auth.js');

console.assert(process.env.DATABASE_URL, "No database provided, set DATABASE_URL to a postgres db!");

let alamo = { 
  addon_attachments:require('./lib/addon-attachments.js'),
  addon_services:require('./lib/addon-services.js'),
  apps:require('./lib/apps.js'),
  app_setups:require('./lib/app-setups.js'),
  builds:require('./lib/builds.js'),
  certificates:require('./lib/certificates.js'),
  dynos:require('./lib/dynos.js'),
  formations:require('./lib/formations.js'), 
  releases:require('./lib/releases.js'), 
  github:require('./lib/github.js'), 
  logs:require('./lib/logs.js'),
  log_drains:require('./lib/log-drains.js'),
  metrics:require('./lib/metrics.js'), 
  config_var:require('./lib/config-var.js'),
  config:require('./lib/config.js'), 
  spaces:require('./lib/spaces.js'),
  organizations:require('./lib/organizations.js'),
  pipelines:require('./lib/pipelines.js'),
  plugins:require('./lib/plugins.js'),
  sites:require('./lib/sites.js'),
  routes:require('./lib/routes.js'),
  hooks:require('./lib/hooks.js'),
  invoices:require('./lib/invoices.js'),
  favorites:require('./lib/favorites.js'),
  regions:require('./lib/regions.js'),
  stacks:require('./lib/stacks.js')
};


let simple_key = simple_key_auth(config.simple_key);
let curl = url.parse(process.env.DATABASE_URL);

let db_conf = {
  user: curl.auth ? curl.auth.split(':')[0] : '',
  password: curl.auth ? curl.auth.split(':')[1] : '',
  host:curl.hostname,
  database:((curl.path.indexOf('?') > -1) ? curl.path.substring(1,curl.path.indexOf("?")) : curl.path).replace(/^\//, ''),
  port:curl.port,
  max:10,
  idleTimeoutMillis:30000,
  ssl:false
};


let pg_pool = new pg.Pool(db_conf);
pg_pool.on('error', (err, client) => { console.error("Postgres Pool Error: ", err); });

async function db_setup(pg_pool) {
  try {
    await query(fs.readFileSync('./sql/create.sql').toString('utf8'), (r) => { return r }, pg_pool, [])
  } catch (e) {
    console.error("Unable to successfully connect to postgresql database:", e)
    process.exit(1) // this is very fatal.
  }
}
// Run setup scripts
db_setup(pg_pool)
  .then(() => {
    // Start timers
    alamo.builds.timers.begin(pg_pool)
    alamo.releases.timers.begin(pg_pool)
    alamo.formations.timers.begin(pg_pool)
    alamo.addon_services.timers.begin(pg_pool)
  })
  .catch(e => console.error(e.message, e.stack))




// -- apps
routes.add.get('/apps$')
          .run(alamo.apps.http.list.bind(alamo.apps.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/apps$')
          .run(alamo.apps.http.create.bind(alamo.apps.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.apps.http.update.bind(alamo.apps.http.update, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.apps.http.delete.bind(alamo.apps.http.delete, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.apps.http.get.bind(alamo.apps.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/formation/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.formations.get.bind(alamo.formations.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/formation$')
          .run(alamo.formations.http.create.bind(alamo.formations.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/formation$')
          .run(alamo.formations.list.bind(alamo.formations.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/formation$')
          .run(alamo.formations.batch_update.bind(alamo.formations.batch_update, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/formation/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.formations.update.bind(alamo.formations.update, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/formation/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.formations.delete.bind(alamo.formations.delete, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/routes$')
          .run(alamo.routes.http.list.bind(alamo.routes.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/sizes$')
          .run(alamo.formations.sizes.bind(alamo.formations.sizes, pg_pool))
          .and.authorization([simple_key]);

// -- dynos
// List Dynos
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/dynos$')
          .run(alamo.dynos.list.bind(alamo.dynos.list, pg_pool))
          .and.authorization([simple_key]);
// Dyno Info
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.dynos.info.bind(alamo.dynos.info, pg_pool))
          .and.authorization([simple_key]);
// Restart All Dynos
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/dynos$')
          .run(alamo.dynos.restart_app.bind(alamo.dynos.restart_app, pg_pool))
          .and.authorization([simple_key]);
// Restart Specific Dyno
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.dynos.restart_dyno.bind(alamo.dynos.restart_dyno, pg_pool))
          .and.authorization([simple_key]);
// Stop Specific Dyno
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)/actions/stop$')
          .run(alamo.dynos.stop.bind(alamo.dynos.stop, pg_pool))
          .and.authorization([simple_key]);

// metrics 
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/metrics([A-z0-9\\=\\?\\-\\_\\.\\&\\:]*)$')
          .run(alamo.metrics.http.get.bind(alamo.metrics.http.get, pg_pool))
          .and.authorization([simple_key]);

// -- builds
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.builds.http.get.bind(alamo.builds.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.builds.stop.bind(alamo.builds.stop, pg_pool))
          .and.authorization([simple_key]);
routes.add.put('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.builds.rebuild.bind(alamo.builds.rebuild, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)/result$')
          .run(alamo.builds.result.bind(alamo.builds.result, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/builds$')
          .run(alamo.builds.http.create.bind(alamo.builds.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds$')
          .run(alamo.builds.http.list.bind(alamo.builds.http.list, pg_pool))
          .and.authorization([simple_key]);

// -- auto build with github, get and post. should github be mounted to auto?
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto$')
          .run(alamo.github.autobuild.bind(alamo.github.autobuild, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto/github$')
          .run(alamo.github.info.bind(alamo.github.info, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto/github$')
          .run(alamo.github.autobuild_remove.bind(alamo.github.autobuild_remove, pg_pool))
          .and.authorization([simple_key]);

// -- Github callbacks, no auth but authenticated through
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto/github$')
          .run(alamo.github.webhook.bind(alamo.github.webhook, pg_pool));
// -- Build callbacks
routes.add.post('/builds/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.builds.http.status_change.bind(alamo.builds.http.status_change, pg_pool));

// -- config vars
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/config-vars$')
          .run(alamo.config_var.http.get.bind(alamo.config_var.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/config-vars$')
          .run(alamo.config_var.http.update.bind(alamo.config_var.http.update, pg_pool))
          .and.authorization([simple_key]);

// -- releases
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/releases$')
          .run(alamo.releases.http.create.bind(alamo.releases.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/releases$')
          .run(alamo.releases.http.list.bind(alamo.releases.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/releases/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.releases.http.get.bind(alamo.releases.http.get, pg_pool))
          .and.authorization([simple_key]);

// -- log drains & log sessions
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/log-sessions$')
          .run(alamo.logs.http.create.bind(alamo.logs.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/log-drains$')
          .run(alamo.log_drains.http.create.bind(alamo.log_drains.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/log-drains/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.log_drains.http.get.bind(alamo.log_drains.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/log-drains$')
          .run(alamo.log_drains.http.list.bind(alamo.log_drains.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/log-drains/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.log_drains.http.delete.bind(alamo.log_drains.http.delete, pg_pool))
          .and.authorization([simple_key]);

// -- addons
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/addons$')
          .run(alamo.addon_services.addons.http.create.bind(alamo.addon_services.addons.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addons$')
          .run(alamo.addon_services.addons.http.list.bind(alamo.addon_services.addons.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_services.addons.get.bind(alamo.addon_services.addons.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_services.addons.delete.bind(alamo.addon_services.addons.delete, pg_pool))
          .and.authorization([simple_key]);
// -- addon actions
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_services.addons.actions.bind(alamo.addon_services.addons.actions, pg_pool))
          .and.authorization([simple_key]);

// GET /apps/{app_name_or_id}/addons/{addon_name_or_id}/config ?

// hook callbacks
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/hooks$')
          .run(alamo.hooks.list.bind(alamo.hooks.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/hooks$')
          .run(alamo.hooks.create.bind(alamo.hooks.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.hooks.get.bind(alamo.hooks.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.hooks.update.bind(alamo.hooks.update, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.hooks.delete.bind(alamo.hooks.delete, pg_pool))
          .and.authorization([simple_key]);

// -- spaces
routes.add.get('/spaces$')
          .run(alamo.spaces.list.bind(alamo.spaces.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/spaces$')
          .run(alamo.spaces.create.bind(alamo.spaces.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/spaces/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.spaces.get.bind(alamo.spaces.get, pg_pool))
          .and.authorization([simple_key]);

// -- organizations
routes.add.get('/organizations$')
          .run(alamo.organizations.list.bind(alamo.organizations.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/organizations$')
          .run(alamo.organizations.create.bind(alamo.organizations.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/organizations/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.organizations.get.bind(alamo.organizations.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/organizations/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.organizations.delete.bind(alamo.organizations.delete, pg_pool))
          .and.authorization([simple_key]);

// -- invoices
routes.add.get('/account/invoices$')
          .run(alamo.invoices.list.bind(alamo.invoices.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/account/invoices/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.invoices.get.bind(alamo.invoices.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/organizations/([A-z0-9\\-\\_\\.]+)/invoices$')
          .run(alamo.invoices.list_by_org.bind(alamo.invoices.list_by_org, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/organizations/([A-z0-9\\-\\_\\.]+)/invoices/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.invoices.get_by_org.bind(alamo.invoices.get_by_org, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/spaces/([A-z0-9\\-\\_\\.]+)/invoices$')
          .run(alamo.invoices.list_by_space.bind(alamo.invoices.list_by_space, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/spaces/([A-z0-9\\-\\_\\.]+)/invoices/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.invoices.get_by_space.bind(alamo.invoices.get_by_space, pg_pool))
          .and.authorization([simple_key]);

// -- addon services
routes.add.get('/addon-services$')
          .run(alamo.addon_services.services.list.bind(alamo.addon_services.services.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/addon-services/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_services.services.get.bind(alamo.addon_services.services.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/addon-services/([A-z0-9\\-\\_\\.]+)/plans$')
          .run(alamo.addon_services.plans.list.bind(alamo.addon_services.plans.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/addon-services/([A-z0-9\\-\\_\\.]+)/plans/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_services.plans.get.bind(alamo.addon_services.plans.get, pg_pool))
          .and.authorization([simple_key]);


// -- ssl endpoint and orders, requires ssl plugin
routes.add.get('/ssl-orders$')
          .run(alamo.certificates.orders.list.bind(alamo.certificates.orders.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/ssl-orders$')
          .run(alamo.certificates.orders.create.bind(alamo.certificates.orders.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/ssl-orders/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.certificates.orders.get.bind(alamo.certificates.orders.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.put('/ssl-orders/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.certificates.orders.install.bind(alamo.certificates.orders.install, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/ssl-endpoints$')
          .run(alamo.certificates.list.bind(alamo.certificates.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/ssl-endpoints/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.certificates.get.bind(alamo.certificates.get, pg_pool))
          .and.authorization([simple_key]);

// -- global addon stuff TODO
// GET    /addons
// GET    /addons/{addon_id_or_name}
// GET    /addons/{addon_id_or_name}/config

// -- addon attachments
routes.add.get('/addons/([A-z0-9\\-\\_\\.]+)/addon-attachments$')
          .run(alamo.addon_attachments.list_by_addon.bind(alamo.addon_attachments.list_by_addon, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addon-attachments$')
          .run(alamo.addon_attachments.http.list_by_app.bind(alamo.addon_attachments.http.list_by_app, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_attachments.get.bind(alamo.addon_attachments.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_attachments.get_by_id.bind(alamo.addon_attachments.get_by_id, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.addon_attachments.delete_by_id.bind(alamo.addon_attachments.delete_by_id, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/addon-attachments$')
          .run(alamo.addon_attachments.list.bind(alamo.addon_attachments.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/addon-attachments$')
          .run(alamo.addon_attachments.http.create.bind(alamo.addon_attachments.http.create, pg_pool))
          .and.authorization([simple_key]);

// -- pipelines
routes.add.post('/pipelines$')
          .run(alamo.pipelines.http.create.bind(alamo.pipelines.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipelines$')
          .run(alamo.pipelines.http.list.bind(alamo.pipelines.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipelines/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.pipelines.http.get.bind(alamo.pipelines.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/pipelines/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.pipelines.http.delete.bind(alamo.pipelines.http.delete, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipeline-stages$')
          .run(alamo.pipelines.stages.http.get.bind(alamo.pipelines.stages.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/pipeline-couplings$')
          .run(alamo.pipelines.couplings.http.create.bind(alamo.pipelines.couplings.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/pipeline-couplings$')
          .run(alamo.pipelines.couplings.http.get_by_app.bind(alamo.pipelines.couplings.http.get_by_app, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipelines/([A-z0-9\\-\\_\\.]+)/pipeline-couplings$')
          .run(alamo.pipelines.couplings.http.list_by_pipeline.bind(alamo.pipelines.couplings.http.list_by_pipeline, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipeline-couplings$')
          .run(alamo.pipelines.couplings.http.list.bind(alamo.pipelines.couplings.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipeline-couplings/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.pipelines.couplings.http.get.bind(alamo.pipelines.couplings.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/pipeline-couplings/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.pipelines.couplings.http.delete.bind(alamo.pipelines.couplings.http.delete, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/pipeline-promotions$')
          .run(alamo.pipelines.promotions.http.create.bind(alamo.pipelines.promotions.http.create, pg_pool))
          .and.authorization([simple_key]);

// -- regions
routes.add.get('/regions$')
          .run(alamo.regions.http.list.bind(alamo.regions.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/regions$')
          .run(alamo.regions.http.create.bind(alamo.regions.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/regions/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.regions.http.get.bind(alamo.regions.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/regions/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.regions.http.update.bind(alamo.regions.http.update, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/regions/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.regions.http.delete.bind(alamo.regions.http.delete, pg_pool))
          .and.authorization([simple_key]);

// -- stacks
routes.add.get('/stacks$')
          .run(alamo.stacks.http.list.bind(alamo.stacks.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/stacks$')
          .run(alamo.stacks.http.create.bind(alamo.stacks.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/stacks/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.stacks.http.get.bind(alamo.stacks.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/stacks/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.stacks.http.update.bind(alamo.stacks.http.update, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/stacks/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.stacks.http.delete.bind(alamo.stacks.http.delete, pg_pool))
          .and.authorization([simple_key]);


routes.add.get('/pipeline-promotions$')
          .run(alamo.pipelines.promotions.http.list.bind(alamo.pipelines.promotions.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipeline-promotions/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.pipelines.promotions.http.get.bind(alamo.pipelines.promotions.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/pipeline-promotions/([A-z0-9\\-\\_\\.]+)/promotion-targets$')
          .run(alamo.pipelines.http.list_promotion_target.bind(alamo.pipelines.http.list_promotion_target, pg_pool))
          .and.authorization([simple_key]);

// Health check
routes.add.get('/octhc$').run(octhc.bind(octhc, pg_pool));

// Global plugin registry
routes.add.get('/plugins$')
          .run(alamo.plugins.list.bind(alamo.plugins.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/plugins$')
          .run(alamo.plugins.create.bind(alamo.plugins.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/plugins/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.plugins.info.bind(alamo.plugins.info, pg_pool))
          .and.authorization([simple_key]);
routes.add.patch('/plugins/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.plugins.update.bind(alamo.plugins.update, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/plugins/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.plugins.delete.bind(alamo.plugins.delete, pg_pool))
          .and.authorization([simple_key]);

// Sites / path routes
routes.add.get('/sites$')
          .run(alamo.sites.http.list.bind(alamo.sites.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/sites$')
          .run(alamo.sites.http.create.bind(alamo.sites.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/sites/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.sites.http.get.bind(alamo.sites.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/sites/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.sites.http.delete.bind(alamo.sites.http.delete, pg_pool))
          .and.authorization([simple_key]);

// Routes by site
routes.add.get('/sites/([A-z0-9\\-\\_\\.]+)/routes$')
          .run(alamo.routes.http.list.bind(alamo.routes.http.list, pg_pool))
          .and.authorization([simple_key]);

// Routes
routes.add.get('/routes$')
          .run(alamo.routes.http.list.bind(alamo.routes.http.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/routes$')
          .run(alamo.routes.http.create.bind(alamo.routes.http.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/routes/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.routes.http.get.bind(alamo.routes.http.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/routes/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.routes.http.delete.bind(alamo.routes.http.delete, pg_pool))
          .and.authorization([simple_key]);

// Favorites
routes.add.get('/favorites$')
          .run(alamo.favorites.list.bind(alamo.favorites.list, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/favorites$')
          .run(alamo.favorites.create.bind(alamo.favorites.create, pg_pool))
          .and.authorization([simple_key]);
routes.add.delete('/favorites/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.favorites.delete.bind(alamo.favorites.delete, pg_pool))
          .and.authorization([simple_key]);

// App setups
// merges the app.json and payload from app-setup,
// however we could make only the source field required
// and assume a random name, in the future merge it with app.json.
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/app-setups$')
          .run(alamo.app_setups.definition.bind(alamo.app_setups.definition, pg_pool))
          .and.authorization([simple_key]);
routes.add.get('/app-setups/([A-z0-9\\-\\_\\.]+)$')
          .run(alamo.app_setups.get.bind(alamo.app_setups.get, pg_pool))
          .and.authorization([simple_key]);
routes.add.post('/app-setups$')
          .run(alamo.app_setups.create.bind(alamo.app_setups.create, pg_pool))
          .and.authorization([simple_key]);



routes.add.default((req, res) => {
  if(process.env.DEBUG === "true") {
    console.info('[debug] 404', req.url);
  }
  res.writeHead(404,{}); res.end();
});

let server = http.createServer((req, res) => {
  var method = req.method.toLowerCase();
  var path = url.parse(req.url.toLowerCase()).path;
  routes.process(method, path, req, res).catch((e) => { console.error("Uncaught error:", e) })
}).listen(process.env.PORT || 5000, () => {
  if(!process.env.TEST_MODE) {
    console.log("Server started and listening on port " + (process.env.PORT || 5000) );
  }
});

process.on('uncaughtException', (e) => {
  console.error(e.message);
  console.error(e.stack);
});

module.exports = {routes:routes, pg_pool:pg_pool};