const url = require('url')
const releases = require('./lib/releases.js')
const config = require('./lib/config.js')
const pg = require('pg');
const query = require('./lib/query.js');
const fs = require('fs');
const git = require('./lib/git.js');
const tasks = require('./lib/tasks.js');
const addon_services = require('./lib/addon-services.js');
const previews = require('./lib/previews.js')

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


(async () => {
  // Run any database migrations necessary.
  await query(fs.readFileSync('./sql/create.sql').toString('utf8'), null, pg_pool, [])
  console.log('Any database migrations have completed.')
  // Start timers
  releases.timers.begin(pg_pool)
  git.init(pg_pool)
  tasks.begin(pg_pool)
  addon_services.timers.begin(pg_pool)
  previews.timers.begin(pg_pool)
  let pkg = JSON.parse(fs.readFileSync('./package.json').toString('utf8'));
  console.log()
  console.log(`Akkeris Controller API - Worker - (v${pkg.version}) Ready`)
})().catch(e => {
  console.error("Initialization failed, this is fatal.")
  console.error(e.message, e.stack)
  process.exit(1)
})


process.on('uncaughtException', (e) => {
  console.error(e.message);
  console.error(e.stack);
});