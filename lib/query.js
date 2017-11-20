"use strict"

async function query(query_statement, apply_func, pg_pool, parameters) {
  parameters = parameters.map((x) => {
    if(typeof(x) === 'undefined') {
      return null;
    } else {
      return x;
    }
  })
  let client = await pg_pool.connect()
  try {
    let result = await client.query(query_statement, parameters)
    return apply_func ? result.rows.map(apply_func) : result.rows;
  } finally {
    client.release()
  }
}

module.exports = query;