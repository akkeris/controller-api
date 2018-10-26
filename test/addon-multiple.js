"use strict"

process.env.TEST_MODE = "true"
process.env.PORT = 5000
process.env.AUTH_KEY = 'hello'

const test = require('./support/init.js')
const request = require('../lib/http_helper.js').request
const expect = require("chai").expect;
const pg = require('pg');
const url = require('url');

describe("addons multiple: test the ability to promote and primary/secondary addons", function() {
  this.timeout(1000 * 1000)
  
  let testapp1 = null
  let testapp2 = null
  let postgres1_testapp1 = null
  let postgres2_testapp1 = null
  let postgres3_testapp2 = null
  let postgres1_dburl = null
  let postgres2_dburl = null
  let postgres3_dburl = null
  let securekey1 = null
  let securekey2 = null
  let attached_testapp2 = null

  it("setup: provision resources", async () => {
    testapp1 = await test.create_test_app("preview")
    testapp2 = await test.create_test_app("preview")
    //let build1 = await test.create_build(testapp1, "docker://docker.io/akkeris/test-sample:latest", 2000)
    //let build2 = await test.create_build(testapp2, "docker://docker.io/akkeris/test-sample:latest", 2000)
    //await Promise.all([test.wait_for_build(testapp1.key, build1.id),test.wait_for_build(testapp2.key, build2.id)])
    postgres1_testapp1 = await test.create_addon(testapp1, 'alamo-postgresql', 'hobby')
    let vars = await test.get_config_vars(testapp1)
    let prefix = postgres1_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    expect(vars[prefix + '_DATABASE_URL']).to.be.undefined
    expect(vars['DATABASE_URL']).to.be.a('string')

    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`, test.alamo_headers, null))
    expect(info1.primary).to.equal(true)

    postgres2_testapp1 = await test.create_addon(testapp1, 'alamo-postgresql', 'hobby')
  })

  it("ensure multiple addons are allowed on one app", async () => {
    let vars = await test.get_config_vars(testapp1)
    let prefix = postgres2_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    postgres1_dburl = postgres1_testapp1.config_vars['DATABASE_URL']
    postgres2_dburl = postgres2_testapp1.config_vars[prefix + '_DATABASE_URL']
    expect(vars['DATABASE_URL']).to.equal(postgres1_testapp1.config_vars['DATABASE_URL'])
    expect(vars['DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.equal(postgres2_testapp1.config_vars[prefix + '_DATABASE_URL'])
    expect(postgres2_testapp1.config_vars['DATABASE_URL']).to.be.undefined;
    expect(vars['DATABASE_URL']).to.not.equal(vars[prefix + '_DATABASE_URL'])
    
    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`, test.alamo_headers, null))
    let info2 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres2_testapp1.id}`, test.alamo_headers, null))

    expect(info1.primary).to.equal(true)
    expect(info2.primary).to.equal(false)
  })

  if(process.env.SMOKE_TESTS) {
    it("ensure workers see config changes", async () => {
      let build_info = await test.create_build(testapp1, 'docker://docker.io/akkeris/test-worker2:v6')
      await test.wait_for_build(testapp1.id, build_info.id);
      await test.create_formation(testapp1, 'worker', 'node worker.js')
      await test.wait_for_apptype(testapp1, 'worker')
      await test.wait(15000)

      // connect to db
      let curl = url.parse(postgres1_testapp1.config_vars.DATABASE_URL);
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
      let result = await client.query("select data from envs", [])
      let env = JSON.parse(result.rows[0].data)
      expect(env['DATABASE_URL']).to.equal(postgres1_dburl)
      let prefix = postgres2_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
      expect(env[prefix + '_DATABASE_URL']).to.equal(postgres2_dburl)
      client.release()
    })
  }

  it("ensure secondary databases can be promoted to primary", async () => {
    await request('patch', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres2_testapp1.id}`, test.alamo_headers, JSON.stringify({"primary":true}))
    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`, test.alamo_headers, null))
    let info2 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres2_testapp1.id}`, test.alamo_headers, null))

    expect(info1.primary).to.equal(false)
    expect(info2.primary).to.equal(true)
    
    let vars = await test.get_config_vars(testapp1)
    let prefix = postgres1_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    expect(vars['DATABASE_URL']).to.equal(postgres2_dburl)
    expect(vars['DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.equal(postgres1_dburl)
    expect(vars['DATABASE_URL']).to.not.equal(vars[prefix + '_DATABASE_URL'])
  })

  it("ensure attached addons and owned addons can co-exist", async () => {
    postgres3_testapp2 = await test.create_addon(testapp2, 'alamo-postgresql', 'hobby')
    attached_testapp2 = await test.attach_addon(testapp2, postgres2_testapp1)

    let prefix = attached_testapp2.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    postgres3_dburl = postgres3_testapp2.config_vars['DATABASE_URL']

    let vars = await test.get_config_vars(testapp2)
    expect(vars['DATABASE_URL']).to.equal(postgres3_dburl)
    expect(vars['DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.equal(postgres2_dburl)
    expect(vars['DATABASE_URL']).to.not.equal(vars[prefix + '_DATABASE_URL'])
    
    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`, test.alamo_headers, null))
    let info2 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`, test.alamo_headers, null))

    expect(info1.primary).to.equal(true)
    expect(info2.primary).to.equal(false)
  })

  it("ensure attached addons and owned addons can co-exist", async () => {
    // what happens when you detach a non-primary with a primary addon
    let prefix = attached_testapp2.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    await test.detach_addon(testapp2, attached_testapp2)

    let vars = await test.get_config_vars(testapp2)
    expect(vars['DATABASE_URL']).to.equal(postgres3_dburl)
    expect(vars['DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.be.undefined;
    
    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`, test.alamo_headers, null))
    expect(info1.primary).to.equal(true)

    // what happens when you reattach a previous attached addon
    attached_testapp2 = await test.attach_addon(testapp2, postgres2_testapp1)
    prefix = attached_testapp2.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    postgres3_dburl = postgres3_testapp2.config_vars['DATABASE_URL']

    vars = await test.get_config_vars(testapp2)
    expect(vars['DATABASE_URL']).to.equal(postgres3_dburl)
    expect(vars['DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.be.a('string')
    expect(vars[prefix + '_DATABASE_URL']).to.equal(postgres2_dburl)
    expect(vars['DATABASE_URL']).to.not.equal(vars[prefix + '_DATABASE_URL'])
    
    info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`, test.alamo_headers, null))
    let info2 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`, test.alamo_headers, null))

    expect(info1.primary).to.equal(true)
    expect(info2.primary).to.equal(false)
  })

  it("ensure addon+attachment can be promoted", async() => {
    await request('patch', `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`, test.alamo_headers, JSON.stringify({"primary":true}))
     
    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`, test.alamo_headers, null))
    let info2 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addon-attachments/${attached_testapp2.id}`, test.alamo_headers, null))

    expect(info1.primary).to.equal(false)
    expect(info2.primary).to.equal(true)

    let vars = await test.get_config_vars(testapp2)
    expect(vars['DATABASE_URL']).to.equal(postgres2_dburl)
    expect(vars['DATABASE_URL']).to.be.a('string')
  })

  it("ensure addon+attachment returns to normal on dettach", async() => {
    await test.detach_addon(testapp2, attached_testapp2)

    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp2.id}/addons/${postgres3_testapp2.id}`, test.alamo_headers, null))
    expect(info1.primary).to.equal(true)

    let vars = await test.get_config_vars(testapp2)
    expect(vars['DATABASE_URL']).to.equal(postgres3_dburl)
  })

  it("ensure when we delete a primary database the other database becomes primary", async () => {
    await test.delete_addon(testapp1, postgres2_testapp1)
    
    let info1 = JSON.parse(await request('get', `http://localhost:5000/apps/${testapp1.id}/addons/${postgres1_testapp1.id}`, test.alamo_headers, null))
    expect(info1.primary).to.equal(true)

    let vars = await test.get_config_vars(testapp1)
    let prefix = postgres1_testapp1.name.split('-').slice(2).join('-').replace(/-/g, '_').replace(/ /g, '').replace(/[^a-zA-Z0-9\_]/g, '').trim().toUpperCase()
    expect(vars['DATABASE_URL']).to.equal(postgres1_dburl)
    expect(vars[prefix + '_DATABASE_URL']).to.be.undefined
  })

  it("tear down: deprovision resources", async () => {
    await test.remove_app(testapp2)
    await test.remove_app(testapp1)
  })
})
