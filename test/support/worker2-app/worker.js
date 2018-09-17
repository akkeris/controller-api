"use strict"

const pg = require('pg');
const url = require('url');

(async function () {
  
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

  let client = await pg_pool.connect()
  try {
    await client.query("create table if not exists envs (data text)", [])
    await client.query("insert into envs values ($1)", [JSON.stringify(process.env)])
  } finally {
    client.release()
  }
})().catch((e) => console.log(e))

setInterval(() => console.log('Running'), 10000)