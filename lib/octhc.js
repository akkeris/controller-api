const common = require('./common.js');
const query = require('./query.js');

module.exports = async function (pg_pool, req, res /* regex */) {
  try {
    const result = await query('select 1 as status_check', null, pg_pool, []);
    if (result[0].status_check !== 1) {
      throw new Error('result was wrong.');
    }
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.write('overall_status=bad,postgres_connect_failed');
    res.end();
    return;
  }
  try {
    await common.alamo.sizes(pg_pool);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.write('overall_status=bad,backing_alamo_api_unavailable');
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.write('overall_status=good');
  res.end();
};
