const url = require('url');
const pg = require('pg');
const fs = require('fs');
const releases = require('./lib/releases.js');
const query = require('./lib/query.js');
const git = require('./lib/git.js');
const tasks = require('./lib/tasks.js');
const addon_services = require('./lib/addon-services.js');
const previews = require('./lib/previews.js');
const common = require('./lib/common.js');

const curl = new url.URL(process.env.DATABASE_URL);

const db_conf = {
  user: curl.username ? curl.username : '',
  password: curl.password ? curl.password : '',
  host: curl.hostname,
  database: curl.pathname.replace(/^\//, ''),
  port: curl.port,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: false,
};


const pg_pool = new pg.Pool(db_conf);
pg_pool.on('error', (err) => { console.error('Postgres Pool Error: ', err); });


(async () => {
  // Run any database migrations necessary.
  await query(fs.readFileSync('./sql/create.sql').toString('utf8'), null, pg_pool, []);
  console.log('Any database migrations have completed.');
  // Start timers
  common.init(pg_pool);
  releases.timers.begin(pg_pool);
  git.init(pg_pool);
  tasks.begin(pg_pool);
  addon_services.timers.begin(pg_pool);
  previews.timers.begin(pg_pool);
  const pkg = JSON.parse(fs.readFileSync('./package.json').toString('utf8'));
  console.log();
  console.log(`Akkeris Controller API - Worker - (v${pkg.version}) Ready`);
})().catch((e) => {
  console.error('Initialization failed, this is fatal.');
  console.error(e.message, e.stack);
  process.exit(1);
});


process.on('uncaughtException', (e) => {
  console.error(e.message);
  console.error(e.stack);
});
