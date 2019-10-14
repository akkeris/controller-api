/**
*   Migrates tokens encrypted with the old 'crypto.createCipher` to the new `crypto.createCipheriv` format 
*/

const assert = require('assert');
const pg = require('pg');
const url = require('url');
const crypto = require('crypto');
const query = require('./query.js');
const common = require('./common.js');

const old_key = process.env.ENCRYPT_KEY;
const new_key = process.env.ENCRYPT_KEY_192_BITS;
const database_url = process.env.DATABASE_URL;

const select_auth_stmt = `select authorizations.authorization as id, authorizations.token as token from authorizations where authorizations.token not like 'salted:%' and deleted = 'f';`;
const update_auth_stmt = `update authorizations set "token" = $2, updated = now() where "authorization" = $1 and deleted = false;`;

const select_authorizations = query.bind(query, select_auth_stmt, (d) => { return d; });
const update_authorizations = query.bind(query, update_auth_stmt, (d) => { return d; });

function old_decrypt(enc_token) {
  let deciph = crypto.createDecipher('aes192', old_key);
  let token = deciph.update(Buffer.from(enc_token, 'base64'), 'utf8');
  token += deciph.final('utf8');
  return token;
}

async function update_tokens() {
  assert(database_url !== '', 'Environment variable DATABASE_URL not present')
  assert(old_key !== '', 'Environment variable ENCRYPT_KEY not present')
  assert(new_key !== '', 'Environment variable ENCRYPT_KEY_192_BITS not present')
  assert(new_key.length === 24, 'ENCRYPT_KEY_192_BITS must be 24 characters')

  const errors = [];

  let curl = new url.URL(database_url);

  let db_conf = {
    user: curl.username ? curl.username : '',
    password: curl.password ? curl.password : '',
    host: curl.hostname,
    database: curl.pathname.replace(/^\//, ''),
    port: curl.port,
    max: 5,
    idleTimeoutMillis: 20000,
    ssl: false
  };

  let pg_pool = new pg.Pool(db_conf);
  pg_pool.on('error', (err, client) => { console.error("Postgres Pool Error: ", err); });

  const authorizations = await select_authorizations(pg_pool, []);

  console.log('\nSalting authorizations...');
  const salted_tokens = authorizations.reduce((result, auth) => {
    let new_token = '';
    try {
      const token = old_decrypt(auth.token);
      new_token = common.encrypt_token(new_key, token);
    } catch (err) {
      errors.push(`ERROR: Salting authorization ${auth.id} failed. (Row not modified)\n\t${err.code}`);
      return result;
    }
    result.push({ id: auth.id, token: new_token });
    return result;
  }, []);
  console.log('Salting authorizations complete!');

  console.log('\nVerification starting...');

  const verified_tokens = salted_tokens.reduce((result, auth) => {
    if (old_decrypt(authorizations.find((a) => a.id === auth.id).token) !== common.decrypt_token(new_key, auth.token)) {
      errors.push(`Authorization ${auth.id} did not pass verification. (Row not modified)`);
    } else {
      result.push(auth);
    }
    return result;
  }, []);

  console.log('Verification complete!');

  console.log('\nUpdating database...');

  const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
  await asyncForEach(verified_tokens, async (auth) => {
    await update_authorizations(pg_pool, [auth.id, auth.token]);
  });

  console.log('Database update complete!');

  if (errors.length > 0) {
    console.log(`\nThe following ${errors.length} errors need to be manually resolved:`);
    errors.forEach((error, idx) => {
      console.log(idx + 1, error)
    })
    process.exit(1)
  }
  process.exit(0)
}

module.exports = {
  update_tokens,
}