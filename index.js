const assert = require('assert');
const fs = require('fs');
const url = require('url');
const http = require('http');
const pg = require('pg');
const query = require('./lib/query.js');
const config = require('./lib/config.js');

assert.ok(config.database_url, 'No database provided, set DATABASE_URL to a postgres db!');
assert.ok(config.simple_key.length > 0, 'No SECURE_KEY addon or AUTH_KEY environment variable was found, set AUTH_KEY in the environment.');
assert.ok(config.akkeris_app_controller_url, 'The AKKERIS_APP_CONTROLLER_URL is not defined. This is required.');
assert.ok(config.build_shuttle_url, 'The BUILD_SHUTTLE_URL is not defined. This is required.');
assert.ok(config.akkeris_api_url, 'The AKKERIS_API_URL is not defined. This is required.');

const octhc = require('./lib/octhc.js');
const routes = require('./lib/router.js');
const { simple_key, jwt_key } = require('./lib/auth.js')(config.simple_key, config.jwt_public_cert, config.akkeris_api_url);
const common = require('./lib/common.js');

const alamo = {
  addon_attachments: require('./lib/addon-attachments.js'),
  addon_services: require('./lib/addon-services.js'),
  addons: require('./lib/addons.js'),
  apps: require('./lib/apps.js'),
  app_setups: require('./lib/app-setups.js'),
  builds: require('./lib/builds.js'),
  certificates: require('./lib/certificates.js'),
  consumer_groups: require('./lib/consumer_groups.js'),
  dynos: require('./lib/dynos.js'),
  events: require('./lib/events.js'),
  features: require('./lib/features.js'),
  filters: require('./lib/filters.js'),
  formations: require('./lib/formations.js'),
  releases: require('./lib/releases.js'),
  git: require('./lib/git.js'),
  logs: config.use_logtail ? require('./lib/log-sessions.js') : require('./lib/logs.js'),
  log_drains: require('./lib/log-drains.js'),
  metrics: require('./lib/metrics.js'),
  config_var: require('./lib/config-var.js'),
  config: require('./lib/config.js'),
  spaces: require('./lib/spaces.js'),
  organizations: require('./lib/organizations.js'),
  pipelines: require('./lib/pipelines.js'),
  plugins: require('./lib/plugins.js'),
  previews: require('./lib/previews.js'),
  routes: require('./lib/routes.js'),
  sites: require('./lib/sites.js'),
  tasks: require('./lib/tasks.js'),
  hooks: require('./lib/hooks.js'),
  invoices: require('./lib/invoices.js'),
  favorites: require('./lib/favorites.js'),
  regions: require('./lib/regions.js'),
  stacks: require('./lib/stacks.js'),
  audit: require('./lib/audit.js'),
  topics: require('./lib/topics.js'),
  topic_acls: require('./lib/topic_acls.js'),
  topic_configs: require('./lib/topic_configs.js'),
  topic_schemas: require('./lib/topic_schemas.js'),
  topic_clusters: require('./lib/topic_clusters.js'),
  recommendations: require('./lib/recommendations.js'),
};

const db_url = new url.URL(config.database_url);
const db_conf = {
  user: db_url.username ? db_url.username : '',
  password: db_url.password ? db_url.password : '',
  host: db_url.hostname,
  database: db_url.pathname.replace(/^\//, ''),
  port: db_url.port,
  max: 40,
  idleTimeoutMillis: 30000,
  ssl: false,
};

const pg_pool = new pg.Pool(db_conf);
pg_pool.on('error', (err) => { console.error('Postgres Pool Error: ', err); });

const ready = (async () => {
  if (process.env.TEST_MODE || process.env.ONE_PROCESS_MODE) {
    // normally in a worker.
    // Run any database migrations necessary.
    await query(fs.readFileSync('./sql/create.sql').toString('utf8'), null, pg_pool, []);
    alamo.releases.timers.begin(pg_pool);
    alamo.tasks.begin(pg_pool);
    alamo.previews.timers.begin(pg_pool);
  }
  await common.init(pg_pool);

  alamo.formations.timers.begin(pg_pool);
  alamo.addon_services.timers.begin(pg_pool);
  // Initialize Events
  alamo.git.init(pg_pool);
  alamo.routes.init(pg_pool);
  alamo.topic_acls.init(pg_pool);
  alamo.previews.init(pg_pool);

  // Run token migration (if neccesary)
  if (process.env.RUN_TOKEN_MIGRATION) {
    console.log('Running token migration...');
    const migration = require('./lib/salt_tokens.js');
    const result = await migration.update_tokens();
    if (!result) {
      console.log('WARNING: Token migration was not successful. Please resolve the above issues or unexpected behavior may occur.');
    }
  }

  const pkg = JSON.parse(fs.readFileSync('./package.json').toString('utf8'));
  console.log();
  console.log(`Akkeris Controller API (v${pkg.version}) Ready`);
})();

ready.catch((e) => {
  console.error('Initialization failed, this is fatal.');
  console.error(e.message, e.stack);
  process.exit(1);
});

// -- apps
routes.add.get('/apps(\\?[A-z0-9\\=\\?\\-\\_\\.\\&\\:]*)*$')
  .run(alamo.apps.http.list.bind(alamo.apps.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps$')
  .run(alamo.apps.http.create.bind(alamo.apps.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.apps.http.update.bind(alamo.apps.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.apps.http.delete.bind(alamo.apps.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete apps.
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.apps.http.get.bind(alamo.apps.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/formation/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.formations.http.get.bind(alamo.formations.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/formation$')
  .run(alamo.formations.http.create.bind(alamo.formations.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/formation$')
  .run(alamo.formations.http.list.bind(alamo.formations.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/formation$')
  .run(alamo.formations.http.batch_update.bind(alamo.formations.http.batch_update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/formation/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.formations.http.update.bind(alamo.formations.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/formation/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.formations.http.delete.bind(alamo.formations.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete formations.
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/routes$')
  .run(alamo.routes.http.list.bind(alamo.routes.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/filters$')
  .run(alamo.filters.http.attach.list.bind(alamo.filters.http.attach.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/filters/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.filters.http.attach.get.bind(alamo.filters.http.attach.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/filters$')
  .run(alamo.filters.http.attach.create.bind(alamo.filters.http.attach.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.put('/apps/([A-z0-9\\-\\_\\.]+)/filters/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.filters.http.attach.update.bind(alamo.filters.http.attach.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/filters/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.filters.http.attach.delete.bind(alamo.filters.http.attach.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete filter attachments.

// -- dynos
// Get dyno sizes
routes.add.get('/sizes$')
  .run(alamo.formations.http.sizes.bind(alamo.formations.http.sizes, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// List Dynos
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/dynos$')
  .run(alamo.dynos.http.list.bind(alamo.dynos.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Dyno Info
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.dynos.http.get.bind(alamo.dynos.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Restart All Dynos
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/dynos$')
  .run(alamo.dynos.http.restart_all_dyno_types.bind(alamo.dynos.http.restart_all_dyno_types, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Restart Specific Dyno (or stop oneoff dyno)
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.dynos.http.restart_dyno_type.bind(alamo.dynos.http.restart_dyno_type, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Send Command to Specific Dyno
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)/actions/attach$')
  .run(alamo.dynos.http.attach_dyno.bind(alamo.dynos.http.attach_dyno, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Stop Specific Dyno
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/dynos/([A-z0-9\\-\\_\\.]+)/actions/stop$')
  .run(alamo.dynos.http.restart_dyno.bind(alamo.dynos.http.restart_dyno, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// metrics
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/metrics([A-z0-9\\=\\?\\-\\_\\.\\&\\:]*)$')
  .run(alamo.metrics.http.get.bind(alamo.metrics.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- builds
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.builds.http.get.bind(alamo.builds.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.builds.stop.bind(alamo.builds.stop, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.put('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.builds.rebuild.bind(alamo.builds.rebuild, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds/([A-z0-9\\-\\_\\.]+)/result$')
  .run(alamo.builds.http.result.bind(alamo.builds.http.result, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/builds$')
  .run(alamo.builds.http.create.bind(alamo.builds.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds$')
  .run(alamo.builds.http.list.bind(alamo.builds.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// slugs
routes.add.get('/slugs/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.builds.http.get_slug.bind(alamo.builds.http.get_slug, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- auto build with github, get and post. should github be mounted to auto?
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto$')
  .run(alamo.git.http.autobuild.create.bind(alamo.git.http.autobuild.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto/github$')
  .run(alamo.git.http.autobuild.get.bind(alamo.git.http.autobuild.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto/github$')
  .run(alamo.git.http.autobuild.delete.bind(alamo.git.http.autobuild.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- Github callbacks, no auth but authenticated through
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/builds/auto/github$')
  .run(alamo.git.http.webhook.bind(alamo.git.http.webhook, pg_pool));
// -- Build callbacks
routes.add.post('/builds/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.builds.http.status_change.bind(alamo.builds.http.status_change, pg_pool));

// -- config vars
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/config-vars$')
  .run(alamo.config_var.http.get.bind(alamo.config_var.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/config-vars$')
  .run(alamo.config_var.http.update.bind(alamo.config_var.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/config-vars/notes$')
  .run(alamo.config_var.http.notes.get.bind(alamo.config_var.http.notes.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/config-vars/notes$')
  .run(alamo.config_var.http.notes.update.bind(alamo.config_var.http.notes.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- features
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/features$')
  .run(alamo.features.http.list.bind(alamo.features.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/features/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.features.http.get.bind(alamo.features.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/features/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.features.http.update.bind(alamo.features.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- releases
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/releases$')
  .run(alamo.releases.http.create.bind(alamo.releases.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/releases$')
  .run(alamo.releases.http.list.bind(alamo.releases.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/releases/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.releases.http.get.bind(alamo.releases.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// release statuses
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/releases/([A-z0-9\\-\\_\\.]+)/statuses$')
  .run(alamo.releases.http.status.list.bind(alamo.releases.http.status.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/releases/([A-z0-9\\-\\_\\.]+)/statuses/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.releases.http.status.get.bind(alamo.releases.http.status.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/releases/([A-z0-9\\-\\_\\.]+)/statuses$')
  .run(alamo.releases.http.status.create.bind(alamo.releases.http.status.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/releases/([A-z0-9\\-\\_\\.]+)/statuses/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.releases.http.status.update.bind(alamo.releases.http.status.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- log drains & log sessions
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/log-sessions$')
  .run(alamo.logs.http.create.bind(alamo.logs.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/log-drains$')
  .run(alamo.log_drains.http.create.bind(alamo.log_drains.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/log-drains/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.log_drains.http.get.bind(alamo.log_drains.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/log-drains$')
  .run(alamo.log_drains.http.list.bind(alamo.log_drains.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/log-drains/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.log_drains.http.delete.bind(alamo.log_drains.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

routes.add.post('/sites/([A-z0-9\\-\\_\\.]+)/log-sessions$')
  .run(alamo.logs.http.create.bind(alamo.logs.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/sites/([A-z0-9\\-\\_\\.]+)/log-drains$')
  .run(alamo.log_drains.http.create.bind(alamo.log_drains.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/sites/([A-z0-9\\-\\_\\.]+)/log-drains/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.log_drains.http.get.bind(alamo.log_drains.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/sites/([A-z0-9\\-\\_\\.]+)/log-drains$')
  .run(alamo.log_drains.http.list.bind(alamo.log_drains.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/sites/([A-z0-9\\-\\_\\.]+)/log-drains/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.log_drains.http.delete.bind(alamo.log_drains.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- preview apps
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/previews$')
  .run(alamo.previews.http.list.bind(alamo.previews.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/previews/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.previews.http.get.bind(alamo.previews.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- addons
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/addons$')
  .run(alamo.addons.http.create.bind(alamo.addons.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addons$')
  .run(alamo.addons.http.list.bind(alamo.addons.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.get.bind(alamo.addons.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.update.bind(alamo.addons.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.delete.bind(alamo.addons.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete addons.
// -- addon actions
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.put('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.put('/apps/([A-z0-9\\-\\_\\.]+)/addons/([A-z0-9\\-\\_\\.]+)/actions/([A-z0-9\\-\\_\\.]+)/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.actions.bind(alamo.addons.http.actions, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// GET /apps/{app_name_or_id}/addons/{addon_name_or_id}/config ?

// webhooks
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/hooks$')
  .run(alamo.hooks.list.bind(alamo.hooks.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/hooks$')
  .run(alamo.hooks.create.bind(alamo.hooks.create, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not create webhooks.
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.hooks.get.bind(alamo.hooks.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.hooks.update.bind(alamo.hooks.update, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not update webhooks.
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.hooks.delete.bind(alamo.hooks.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not remove webhooks.
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)/results$')
  .run(alamo.hooks.results.bind(alamo.hooks.results, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/hooks/([A-z0-9\\-\\_\\.]+)/results/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.hooks.result.bind(alamo.hooks.result, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- spaces
routes.add.get('/spaces$')
  .run(alamo.spaces.list.bind(alamo.spaces.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/spaces$')
  .run(alamo.spaces.create.bind(alamo.spaces.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/spaces/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.spaces.get.bind(alamo.spaces.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- organizations
routes.add.get('/organizations$')
  .run(alamo.organizations.list.bind(alamo.organizations.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/organizations$')
  .run(alamo.organizations.create.bind(alamo.organizations.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/organizations/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.organizations.get.bind(alamo.organizations.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/organizations/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.organizations.delete.bind(alamo.organizations.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete organizations.

// -- invoices
routes.add.get('/account/invoices$')
  .run(alamo.invoices.list.bind(alamo.invoices.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/account/invoices/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.invoices.get.bind(alamo.invoices.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/organizations/([A-z0-9\\-\\_\\.]+)/invoices$')
  .run(alamo.invoices.list_by_org.bind(alamo.invoices.list_by_org, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/organizations/([A-z0-9\\-\\_\\.]+)/invoices/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.invoices.get_by_org.bind(alamo.invoices.get_by_org, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/spaces/([A-z0-9\\-\\_\\.]+)/invoices$')
  .run(alamo.invoices.list_by_space.bind(alamo.invoices.list_by_space, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/spaces/([A-z0-9\\-\\_\\.]+)/invoices/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.invoices.get_by_space.bind(alamo.invoices.get_by_space, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- addon services
routes.add.get('/addon-services$')
  .run(alamo.addon_services.services.list.bind(alamo.addon_services.services.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/addon-services/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addon_services.services.get.bind(alamo.addon_services.services.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/addon-services/([A-z0-9\\-\\_\\.]+)/plans$')
  .run(alamo.addon_services.plans.list.bind(alamo.addon_services.plans.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/addon-services/([A-z0-9\\-\\_\\.]+)/plans/([A-z0-9\\-\\_\\.\\:]+)$')
  .run(alamo.addon_services.plans.get.bind(alamo.addon_services.plans.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- ssl endpoint and orders, requires ssl plugin
routes.add.get('/ssl-orders$')
  .run(alamo.certificates.orders.list.bind(alamo.certificates.orders.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/ssl-orders$')
  .run(alamo.certificates.orders.create.bind(alamo.certificates.orders.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/ssl-orders/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.certificates.orders.get.bind(alamo.certificates.orders.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.put('/ssl-orders/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.certificates.orders.install.bind(alamo.certificates.orders.install, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/ssl-endpoints$')
  .run(alamo.certificates.list.bind(alamo.certificates.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/ssl-endpoints/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.certificates.get.bind(alamo.certificates.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- global addons end points
routes.add.get('/addons$')
  .run(alamo.addons.http.list_all.bind(alamo.addons.http.list_all, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/addons/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addons.http.get_by_id.bind(alamo.addons.http.get_by_id, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/addons/([A-z0-9\\-\\_\\.]+)/config$')
  .run(alamo.addons.http.get_config.bind(alamo.addons.http.get_config, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- addon attachments
routes.add.get('/addons/([A-z0-9\\-\\_\\.]+)/addon-attachments$')
  .run(alamo.addon_attachments.http.list_by_addon.bind(alamo.addon_attachments.http.list_by_addon, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/addons/([A-z0-9\\-\\_\\.]+)/addon-attachments$')
  .run(alamo.addon_attachments.http.create.bind(alamo.addon_attachments.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addon-attachments$')
  .run(alamo.addon_attachments.http.list_by_app.bind(alamo.addon_attachments.http.list_by_app, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addon_attachments.http.get.bind(alamo.addon_attachments.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/apps/([A-z0-9\\-\\_\\.]+)/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addon_attachments.http.update.bind(alamo.addon_attachments.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addon_attachments.http.get_by_id.bind(alamo.addon_attachments.http.get_by_id, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/addon-attachments/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.addon_attachments.http.delete.bind(alamo.addon_attachments.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not destroy addon attachments.
routes.add.get('/addon-attachments$')
  .run(alamo.addon_attachments.http.list_all.bind(alamo.addon_attachments.http.list_all, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/addon-attachments$')
  .run(alamo.addon_attachments.http.create.bind(alamo.addon_attachments.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- pipelines
routes.add.post('/pipelines$')
  .run(alamo.pipelines.http.create.bind(alamo.pipelines.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipelines$')
  .run(alamo.pipelines.http.list.bind(alamo.pipelines.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipelines/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.pipelines.http.get.bind(alamo.pipelines.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/pipelines/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.pipelines.http.delete.bind(alamo.pipelines.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipelines/([A-z0-9\\-\\_\\.]+)/statuses$')
  .run(alamo.pipelines.http.list_statuses.bind(alamo.pipelines.http.list_statuses, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- pipeline stages
routes.add.get('/pipeline-stages$')
  .run(alamo.pipelines.stages.http.get.bind(alamo.pipelines.stages.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// -- pipeline coupling management
routes.add.post('/pipeline-couplings$')
  .run(alamo.pipelines.couplings.http.create.bind(alamo.pipelines.couplings.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/pipeline-couplings$')
  .run(alamo.pipelines.couplings.http.get_by_app.bind(alamo.pipelines.couplings.http.get_by_app, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipelines/([A-z0-9\\-\\_\\.]+)/pipeline-couplings$')
  .run(alamo.pipelines.couplings.http.list_by_pipeline.bind(alamo.pipelines.couplings.http.list_by_pipeline, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipeline-couplings$')
  .run(alamo.pipelines.couplings.http.list.bind(alamo.pipelines.couplings.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipeline-couplings/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.pipelines.couplings.http.get.bind(alamo.pipelines.couplings.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/pipeline-couplings/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.pipelines.couplings.http.update.bind(alamo.pipelines.couplings.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/pipeline-couplings/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.pipelines.couplings.http.delete.bind(alamo.pipelines.couplings.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// -- pipeline promotion
routes.add.post('/pipeline-promotions$')
  .run(alamo.pipelines.promotions.http.create.bind(alamo.pipelines.promotions.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- regions
routes.add.get('/regions$')
  .run(alamo.regions.http.list.bind(alamo.regions.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/regions$')
  .run(alamo.regions.http.create.bind(alamo.regions.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/regions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.regions.http.get.bind(alamo.regions.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/regions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.regions.http.update.bind(alamo.regions.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/regions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.regions.http.delete.bind(alamo.regions.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// -- stacks
routes.add.get('/stacks$')
  .run(alamo.stacks.http.list.bind(alamo.stacks.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/stacks$')
  .run(alamo.stacks.http.create.bind(alamo.stacks.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/stacks/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.stacks.http.get.bind(alamo.stacks.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/stacks/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.stacks.http.update.bind(alamo.stacks.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/stacks/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.stacks.http.delete.bind(alamo.stacks.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

routes.add.get('/pipeline-promotions$')
  .run(alamo.pipelines.promotions.http.list.bind(alamo.pipelines.promotions.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipeline-promotions/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.pipelines.promotions.http.get.bind(alamo.pipelines.promotions.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/pipeline-promotions/([A-z0-9\\-\\_\\.]+)/promotion-targets$')
  .run(alamo.pipelines.http.list_promotion_target.bind(alamo.pipelines.http.list_promotion_target, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Health check
routes.add.get('/octhc$').run(octhc.bind(octhc, pg_pool));

// Global plugin registry
routes.add.get('/plugins$')
  .run(alamo.plugins.list.bind(alamo.plugins.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/plugins$')
  .run(alamo.plugins.create.bind(alamo.plugins.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/plugins/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.plugins.info.bind(alamo.plugins.info, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/plugins/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.plugins.update.bind(alamo.plugins.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/plugins/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.plugins.delete.bind(alamo.plugins.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Sites / path routes
routes.add.get('/sites$')
  .run(alamo.sites.http.list.bind(alamo.sites.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/sites$')
  .run(alamo.sites.http.create.bind(alamo.sites.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.patch('/sites/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.sites.http.update.bind(alamo.sites.http.update, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not update sites
routes.add.get('/sites/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.sites.http.get.bind(alamo.sites.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/sites/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.sites.http.delete.bind(alamo.sites.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete sites

// Routes by site
routes.add.get('/sites/([A-z0-9\\-\\_\\.]+)/routes$')
  .run(alamo.routes.http.list.bind(alamo.routes.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Routes
routes.add.get('/routes$')
  .run(alamo.routes.http.list.bind(alamo.routes.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/routes$')
  .run(alamo.routes.http.create.bind(alamo.routes.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/routes/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.routes.http.get.bind(alamo.routes.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/routes/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.routes.http.delete.bind(alamo.routes.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete routes in sites

// Favorites
routes.add.get('/favorites$')
  .run(alamo.favorites.list.bind(alamo.favorites.list, pg_pool))
  .and.authorization([simple_key]); // jwt cannot interact with favorites.
routes.add.post('/favorites$')
  .run(alamo.favorites.create.bind(alamo.favorites.create, pg_pool))
  .and.authorization([simple_key]); // jwt cannot interact with favorites.
routes.add.delete('/favorites/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.favorites.delete.bind(alamo.favorites.delete, pg_pool))
  .and.authorization([simple_key]); // jwt cannot interact with favorites.

// Topic clusters
routes.add.get('/clusters/([A-z0-9_.-]+)$')
  .run(alamo.topic_clusters.get.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/clusters$')
  .run(alamo.topic_clusters.list.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Topic configs
routes.add.get('/clusters/([A-z0-9_.-]+)/configs$')
  .run(alamo.topic_configs.list.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Topics
routes.add.get('/clusters/([A-z0-9_.-]+)/topics$')
  .run(alamo.topics.list.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)$')
  .run(alamo.topics.get.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/preview$')
  .run(alamo.topics.preview.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/clusters/([A-z0-9_.-]+)/topics$')
  .run(alamo.topics.create.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/clusters/([A-z0-9_.-]+)/topics/recreate$')
  .run(alamo.topics.recreate.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)$')
  .run(alamo.topics.delete.bind(null, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete topics

// Topic ACLs
routes.add.get('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/acls$')
  .run(alamo.topic_acls.list_by_topic.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/acls/([A-z0-9_.-]+)/role/(producer|consumer)/consumers/([A-z0-9_.-]+)$')
  .run(alamo.topic_acls.delete_consumer.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/acls/([A-z0-9_.-]+)/role/(producer|consumer)$')
  .run(alamo.topic_acls.delete.bind(null, pg_pool)) // jwt tokens may not delete acl roles
  .and.authorization([simple_key]);
routes.add.post('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/acls$')
  .run(alamo.topic_acls.create.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/topic-acls$')
  .run(alamo.topic_acls.list_by_app.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Consumer Groups
routes.add.get('/clusters/([A-z0-9_.-]+)/consumer-groups$')
  .run(alamo.consumer_groups.list.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/clusters/([A-z0-9_.-]+)/consumer-groups/([A-z0-9_.-]+)/offsets$')
  .run(alamo.consumer_groups.offsets.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/clusters/([A-z0-9_.-]+)/consumer-groups/([A-z0-9_.-]+)/members$')
  .run(alamo.consumer_groups.members.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/clusters/([A-z0-9_.-]+)/consumer-groups/([A-z0-9_.-]+)/seek$')
  .run(alamo.consumer_groups.seek.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Schemas
routes.add.get('/clusters/([A-z0-9_.-]+)/schemas$')
  .run(alamo.topic_schemas.list_schemas.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/schemas$')
  .run(alamo.topic_schemas.list_mappings.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/key-schema-mapping$')
  .run(alamo.topic_schemas.create_key_mapping.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/clusters/([A-z0-9_.-]+)/topics/([A-z0-9_.-]+)/value-schema-mapping$')
  .run(alamo.topic_schemas.create_value_mapping.bind(null, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Audit
routes.add.get('/audits([A-z0-9\\=\\?\\-\\_\\.\\&\\:]*)$')
  .run(alamo.audit.get.bind(alamo.audit.get))
  .and.authorization([simple_key, jwt_key]);

// App setups
// merges the app.json and payload from app-setup,
// however we could make only the source field required
// and assume a random name, in the future merge it with app.json.
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/app-setups$')
  .run(alamo.app_setups.http.definition.bind(alamo.app_setups.http.definition, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/app-setups/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.app_setups.http.get.bind(alamo.app_setups.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/app-setups$')
  .run(alamo.app_setups.http.create.bind(alamo.app_setups.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Events
// listen to events
routes.add.post('/events$')
  .run(alamo.events.http.create.bind(alamo.events.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);

// Filters
routes.add.post('/filters$')
  .run(alamo.filters.http.create.bind(alamo.filters.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.put('/filters/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.filters.http.update.bind(alamo.filters.http.update, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/filters$')
  .run(alamo.filters.http.list.bind(alamo.filters.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.get('/filters/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.filters.http.get.bind(alamo.filters.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.delete('/filters/([A-z0-9\\-\\_\\.]+)$')
  .run(alamo.filters.http.delete.bind(alamo.filters.http.delete, pg_pool))
  .and.authorization([simple_key]); // jwt tokens may not delete filters

// openid jwt tokens for service accounts and webhooks
routes.add.get('/\\.well-known/jwks.json$')
  .run(common.http_jwks_uri.bind(common.http_jwks_uri, config.jwt_public_cert, pg_pool));

// List available webhooks and their descriptions
routes.add.get('/docs/hooks$')
  .run(alamo.hooks.descriptions)
  .and.authorization([simple_key, jwt_key]);

// Recommendations

routes.add.get('/docs/recommendation_resource_types$')
  .run(alamo.recommendations.http.get_resource_types.bind(alamo.recommendations.http.get_resource_types, pg_pool))
  .and.authorization([simple_key, jwt_key]);
routes.add.post('/apps/([A-z0-9\\-\\_\\.]+)/recommendations$')
  .run(alamo.recommendations.http.create.bind(alamo.recommendations.http.create, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// List all recommendations for an app
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/recommendations$')
  .run(alamo.recommendations.http.list.bind(alamo.recommendations.http.list, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Get specific recommendation for an app
routes.add.get('/apps/([A-z0-9\\-\\_\\.]+)/recommendations(\\?[A-z0-9\\-\\_\\.\\=\\&]+)+$')
  .run(alamo.recommendations.http.get.bind(alamo.recommendations.http.get, pg_pool))
  .and.authorization([simple_key, jwt_key]);
// Delete specific recommendation for an app
routes.add.delete('/apps/([A-z0-9\\-\\_\\.]+)/recommendations(\\?[A-z0-9\\-\\_\\.\\=\\&]+)+$')
  .run(alamo.recommendations.http.delete.bind(alamo.recommendations.http.delete, pg_pool))
  .and.authorization([simple_key, jwt_key]);

routes.add.default((req, res) => {
  res.writeHead(404, {});
  res.end();
});

const server = http.createServer((req, res) => {
  const method = req.method.toLowerCase();

  // https://stackoverflow.com/questions/48196706/new-url-whatwg-url-api
  // https://github.com/nodejs/node/issues/12682
  const parsedURL = (new url.URL(req.url.toLowerCase(), `http://${req.headers.host}/`));
  const path = parsedURL.pathname + parsedURL.search;

  routes.process(method, path, req, res).catch((e) => { console.error('Uncaught error:', e); });
}).listen(process.env.PORT || 5000, () => {
  if (!process.env.TEST_MODE) {
    console.log(`Server started and listening on port ${process.env.PORT || 5000}`);
  }
});

server.keepAliveTimeout = 1000 * (60 * 6); // 6 minutes

process.on('uncaughtException', (e) => {
  console.error(e.message);
  console.error(e.stack);
});

module.exports = {
  routes,
  pg_pool,
  server,
  ready,
};
