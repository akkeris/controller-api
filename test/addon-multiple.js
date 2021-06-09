/* eslint-disable no-unused-expressions */
process.env.TEST_MODE = 'true';
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const { expect } = require('chai');
const pg = require('pg');
const url = require('url');
const { request } = require('../lib/http_helper.js');

describe('addons multiple: test the ability to promote and primary/secondary addons', function () {
  const test = require('./support/init.js');
  this.timeout(1000 * 1000);

  let testapp1 = null;
  let testapp2 = null;
  let postgres1_testapp1 = null;
  let postgres2_testapp1 = null;
  let postgres3_testapp1 = null;
  let postgres3_testapp2 = null;
  let postgres1_dburl = null;
  let postgres2_dburl = null;
  let postgres3_dburl = null;
  let attached_testapp2 = null;

  it('setup: provision resources', async () => {
    testapp1 = await test.create_test_app('preview');
    testapp2 = await test.create_test_app('preview');
    postgres1_testapp1 = await test.create_addon(testapp1, 'akkeris-postgresql', 'standard-0');
    expect(postgres1_testapp1.config_vars.DATABASE_URL).to.be.a('string');
    const vars = await test.get_config_vars(testapp1);
    const prefix = postgres1_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.undefined;
    expect(vars.DATABASE_URL).to.be.a('string');

    const info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`,
      test.alamo_headers,
      null,
    ));
    expect(info1.primary).to.equal(true);

    postgres2_testapp1 = await test.create_addon(testapp1, 'akkeris-postgresql', 'standard-0');
    postgres3_testapp1 = await test.create_addon(testapp1, 'akkeris-postgresql', 'standard-0', 'foobar');
  });

  it('ensure you can attach, then create, then remove the attached one', async () => {
    const attachment_testapp2_postgres2 = await test.attach_addon(testapp2, postgres2_testapp1);
    let vars = await test.get_config_vars(testapp2);
    const attachment_database_url = vars.DATABASE_URL;
    expect(attachment_database_url).to.be.a('string');
    const tmp_pg = await test.create_addon(testapp2, 'akkeris-postgresql', 'standard-0');
    vars = await test.get_config_vars(testapp2);
    const prefix = tmp_pg.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    expect(vars.DATABASE_URL).to.equal(attachment_database_url);
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.a('string');
    expect(tmp_pg.config_vars[`${prefix}_DATABASE_URL`]).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.equal(tmp_pg.config_vars[`${prefix}_DATABASE_URL`]);
    await test.detach_addon(testapp2, attachment_testapp2_postgres2);
    vars = await test.get_config_vars(testapp2);
    expect(vars.DATABASE_URL).to.equal(tmp_pg.config_vars[`${prefix}_DATABASE_URL`]);
    test.delete_addon(testapp2, tmp_pg);
  });

  it('ensure multiple addons are allowed on one app', async () => {
    const vars = await test.get_config_vars(testapp1);
    const prefix = postgres2_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    postgres1_dburl = postgres1_testapp1.config_vars.DATABASE_URL;
    postgres2_dburl = postgres2_testapp1.config_vars[`${prefix}_DATABASE_URL`];
    expect(vars.DATABASE_URL).to.equal(postgres1_testapp1.config_vars.DATABASE_URL);
    expect(vars.DATABASE_URL).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.equal(postgres2_testapp1.config_vars[`${prefix}_DATABASE_URL`]);
    expect(postgres2_testapp1.config_vars.DATABASE_URL).to.be.undefined;
    expect(vars.DATABASE_URL).to.not.equal(vars[`${prefix}_DATABASE_URL`]);

    const info1 = await test.addon_info(testapp1, postgres1_testapp1);
    const info2 = await test.addon_info(testapp1, postgres2_testapp1);
    const info3 = await test.addon_info(testapp1, postgres3_testapp1);

    expect(info1.primary).to.equal(true);
    expect(info2.primary).to.equal(false);
    expect(info3.primary).to.equal(false);
  });

  it("ensure naming addons affect the prefix they're given", async () => {
    const info1 = await test.get_config_vars(testapp1);
    expect(postgres3_testapp1.config_vars.FOOBAR_DATABASE_URL).to.be.a('string');
    expect(info1.FOOBAR_DATABASE_URL).to.be.a('string');
    expect(postgres3_testapp1.config_vars.FOOBAR_DATABASE_URL).to.equal(info1.FOOBAR_DATABASE_URL);
  });

  it('ensure renaming addons works', async () => {
    await request(
      'patch',
      `http://localhost:5000/apps/${testapp1.id}/addons/${postgres3_testapp1.id}`,
      test.alamo_headers,
      JSON.stringify({ attachment: { name: 'feebar' } }),
    );
    const addon_info_postgres3 = await test.addon_info(testapp1, postgres3_testapp1);
    const info1 = await test.get_config_vars(testapp1);
    expect(info1.FEEBAR_DATABASE_URL).to.be.a('string');
    expect(postgres3_testapp1.config_vars.FOOBAR_DATABASE_URL).to.equal(info1.FEEBAR_DATABASE_URL);
    expect(postgres3_testapp1.name).to.equal('foobar');
    expect(addon_info_postgres3.name).to.equal('feebar');
    await test.delete_addon(testapp1, postgres3_testapp1);
  });

  if (process.env.SMOKE_TESTS) {
    it('ensure workers see config changes', async () => {
      const build_info = await test.create_build(testapp1, 'docker://docker.io/akkeris/test-worker2:v6');
      await test.wait_for_build(testapp1.id, build_info.id);
      await test.create_formation(testapp1, 'worker', 'node worker.js');
      await test.wait_for_apptype(testapp1, 'worker');
      await test.wait(15000);

      // connect to db
      const curl = new url.URL(postgres1_testapp1.config_vars.DATABASE_URL);
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
      pg_pool.on('error', (err /* client */) => { console.error('Postgres Pool Error: ', err); });

      const client = await pg_pool.connect();
      const result = await client.query('select data from envs', []);
      const env = JSON.parse(result.rows[0].data);
      expect(env.DATABASE_URL).to.equal(postgres1_dburl);
      const prefix = postgres2_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_')
        .replace(/ /g, '')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .trim()
        .toUpperCase();
      expect(env[`${prefix}_DATABASE_URL`]).to.equal(postgres2_dburl);
      client.release();
    });
  }

  it('ensure secondary databases can be promoted to primary', async () => {
    await request(
      'patch',
      `http://localhost:5000/apps/${testapp1.id}/addons/${postgres2_testapp1.id}`,
      test.alamo_headers,
      JSON.stringify({ primary: true }),
    );
    const info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`,
      test.alamo_headers,
      null,
    ));
    const info2 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp1.id}/addons/${postgres2_testapp1.id}`,
      test.alamo_headers,
      null,
    ));

    expect(info1.primary).to.equal(false);
    expect(info2.primary).to.equal(true);

    const vars = await test.get_config_vars(testapp1);
    const prefix = postgres1_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    expect(vars.DATABASE_URL).to.equal(postgres2_dburl);
    expect(vars.DATABASE_URL).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.equal(postgres1_dburl);
    expect(vars.DATABASE_URL).to.not.equal(vars[`${prefix}_DATABASE_URL`]);
  });

  it('ensure attached addons and owned addons can co-exist', async () => {
    postgres3_testapp2 = await test.create_addon(testapp2, 'akkeris-postgresql', 'hobby');
    attached_testapp2 = await test.attach_addon(testapp2, postgres2_testapp1);

    const prefix = attached_testapp2.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    postgres3_dburl = postgres3_testapp2.config_vars.DATABASE_URL;

    const vars = await test.get_config_vars(testapp2);
    expect(vars.DATABASE_URL).to.equal(postgres3_dburl);
    expect(vars.DATABASE_URL).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.equal(postgres2_dburl);
    expect(vars.DATABASE_URL).to.not.equal(vars[`${prefix}_DATABASE_URL`]);

    const info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`,
      test.alamo_headers,
      null,
    ));
    const info2 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`,
      test.alamo_headers,
      null,
    ));

    expect(info1.primary).to.equal(true);
    expect(info2.primary).to.equal(false);
  });

  it('ensure attached addons and owned addons can co-exist', async () => {
    // what happens when you detach a non-primary with a primary addon
    let prefix = attached_testapp2.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    await test.detach_addon(testapp2, attached_testapp2);

    let vars = await test.get_config_vars(testapp2);
    expect(vars.DATABASE_URL).to.equal(postgres3_dburl);
    expect(vars.DATABASE_URL).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.undefined;

    let info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`,
      test.alamo_headers,
      null,
    ));
    expect(info1.primary).to.equal(true);

    // what happens when you reattach a previous attached addon
    attached_testapp2 = await test.attach_addon(testapp2, postgres2_testapp1);
    prefix = attached_testapp2.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    postgres3_dburl = postgres3_testapp2.config_vars.DATABASE_URL;

    vars = await test.get_config_vars(testapp2);
    expect(vars.DATABASE_URL).to.equal(postgres3_dburl);
    expect(vars.DATABASE_URL).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.a('string');
    expect(vars[`${prefix}_DATABASE_URL`]).to.equal(postgres2_dburl);
    expect(vars.DATABASE_URL).to.not.equal(vars[`${prefix}_DATABASE_URL`]);

    info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`,
      test.alamo_headers,
      null,
    ));
    const info2 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`,
      test.alamo_headers,
      null,
    ));

    expect(info1.primary).to.equal(true);
    expect(info2.primary).to.equal(false);
  });

  it('ensure addon+attachment can be promoted', async () => {
    await request(
      'patch',
      `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`,
      test.alamo_headers,
      JSON.stringify({ primary: true }),
    );

    const info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`,
      test.alamo_headers,
      null,
    ));
    const info2 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`,
      test.alamo_headers,
      null,
    ));

    expect(info1.primary).to.equal(false);
    expect(info2.primary).to.equal(true);

    const vars = await test.get_config_vars(testapp2);
    expect(vars.DATABASE_URL).to.equal(postgres2_dburl);
    expect(vars.DATABASE_URL).to.be.a('string');
  });

  it('ensure addon+attachment returns to normal on dettach', async () => {
    await test.detach_addon(testapp2, attached_testapp2);

    const info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`,
      test.alamo_headers,
      null,
    ));
    expect(info1.primary).to.equal(true);

    const vars = await test.get_config_vars(testapp2);
    expect(vars.DATABASE_URL).to.equal(postgres3_dburl);
  });

  it('ensure when we delete a primary database the other database becomes primary', async () => {
    await test.delete_addon(testapp1, postgres2_testapp1);

    const info1 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`,
      test.alamo_headers,
      null,
    ));
    expect(info1.primary).to.equal(true);

    const vars = await test.get_config_vars(testapp1);
    const prefix = postgres1_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_')
      .replace(/ /g, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim()
      .toUpperCase();
    expect(vars.DATABASE_URL).to.equal(postgres1_dburl);
    expect(vars[`${prefix}_DATABASE_URL`]).to.be.undefined;
  });

  it('tear down: deprovision resources', async () => {
    await test.remove_app(testapp2);
    await test.remove_app(testapp1);
  });
});
