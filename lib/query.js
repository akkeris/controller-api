async function query(query_statement, apply_func, pg_pool, parameters) {
  parameters = parameters.map((x) => {
    if (typeof (x) === 'undefined') {
      return null;
    }
    return x;
  });
  const client = await pg_pool.connect();
  let final_result = [];
  try {
    const result = await client.query(query_statement, parameters);
    final_result = apply_func ? result.rows.map(apply_func) : result.rows;
  } finally {
    client.release();
  }
  return final_result;
}

module.exports = query;
