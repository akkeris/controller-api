"use strict"

process.env.PORT = 5000;
process.env.DEFAULT_PORT = "5000";
process.env.AUTH_KEY = 'hello';
process.env.ENCRYPT_KEY = 'hello';
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
const test = require('./support/init.js');

describe("hooks:", function() {
  this.timeout(100000);
  let server = test.create_callback_server()
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000);
  let build_id = null;
  let placed_hooks = false;

  let testapp = null

  it("covers creating a an app and a hook", async () => {
    testapp = await test.create_test_app("default")
    let data = await test.add_hook(testapp, "http://localhost:8001/webhook", [ "release", "build", "formation_change", "logdrain_change", "addon_change", "config_change", "destroy" ], "some secret for hash")
    expect(data.events).to.be.an('array');
    expect(data.url).to.be.a('string');
    expect(data.id).to.be.a('string');
    placed_hooks = true;
  });

  it("covers firing build webhooks", async () => {
    expect(placed_hooks).to.equal(true);
    // create a build and assign the build pending hook listener
    let build_payload_promise = server.wait_for_callback('build', 'to fire on start')
    let build_info = await test.create_test_build(testapp)
    expect(build_info.id).to.be.a('string');
    build_id = build_info.id;
    let payload = await build_payload_promise
    expect(payload.build.result).to.equal('pending');
    payload = await server.wait_for_callback('build', 'to fire on success')
    expect(payload.build.result).to.equal('succeeded');
  });


  let release_succeeded = false;
  let release_id = null;
  it("covers firing release hooks", async () => {
    expect(placed_hooks).to.equal(true);
    let release_payload_promise = server.wait_for_callback('release', 'to fire on success')
    let release_payload = JSON.stringify({"slug":build_id,"description":"Deploy " + build_id})
    let release_info = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${testapp.id}/releases`, alamo_headers, release_payload))
    expect(release_info.id).to.be.a('string');
    expect(release_info.status).to.equal("succeeded");
    release_id = release_info.id;
    let payload = await release_payload_promise;
    expect(payload.release).to.be.an('object');
    expect(payload.release.result).to.equal('succeeded');
    release_succeeded = true
  });


  it("covers firing formation change hooks", async () => {
    expect(release_succeeded).to.equal(true);
    expect(placed_hooks).to.equal(true);
    let release_hook_success = false;
    let formation_payload_promise = server.wait_for_callback('formation_change', 'to fire')
    let formation_payload = JSON.stringify([{"type":"web","quantity":2,"size":"gp2"}])
    let formation_info = await httph.request('patch', `http://localhost:5000/apps/${testapp.id}/formation`, alamo_headers, formation_payload)
    expect(formation_info).to.be.a('string');
    let payload = await formation_payload_promise
    expect(payload.change).to.equal('update');
    expect(payload.changes).to.be.an('array');
    expect(payload.changes[0].type).to.equal('web');
    expect(payload.changes[0].quantity).to.equal(2);
  });

  let hook_id = null;
  it("covers listing hooks", async () => {
    let hook_info = await test.get_hooks(testapp)
    expect(hook_info).to.be.an('array');
    expect(hook_info.length).to.equal(1);
    hook_info = hook_info[0];
    expect(hook_info.id).to.be.a('string');
    hook_id = hook_info.id;
    expect(hook_info.events).to.be.an('array');
    expect(hook_info.url).to.be.a('string');
    expect(hook_info.created_at).to.be.a('string');
    expect(hook_info.updated_at).to.be.a('string');
  });

  it("covers getting hook info", async () => {
    expect(hook_id).to.be.a('string');
    let hook_info = await test.get_hook(testapp, hook_id)
    expect(hook_info.id).to.be.a('string');
    expect(hook_info.id).to.equal(hook_id);
    expect(hook_info.events).to.be.an('array');
    expect(hook_info.url).to.be.a('string');
    expect(hook_info.active).to.equal(true);
    expect(hook_info.created_at).to.be.a('string');
    expect(hook_info.updated_at).to.be.a('string');
  });

  it("covers updating hook", async () => {
    expect(hook_id).to.be.a('string');
    let hook_info = await test.update_hook(testapp, hook_id, "https://foobar", false)
    expect(hook_info.id).to.be.a('string');
    expect(hook_info.id).to.equal(hook_id);
    expect(hook_info.events).to.be.an('array');
    expect(hook_info.url).to.be.a('string');
    expect(hook_info.url).to.equal("https://foobar")
    expect(hook_info.active).to.equal(false)
    expect(hook_info.created_at).to.be.a('string');
    expect(hook_info.updated_at).to.be.a('string');
  });

  it("covers getting hook results", async () => {
    expect(hook_id).to.be.a('string');
    let hook_results_info = await test.get_hook_results(testapp, hook_id)
    expect(hook_results_info).to.be.a('string');
    hook_results_info = JSON.parse(hook_results_info);
    expect(hook_results_info).to.be.an('array');
    // TODO: Inspect more on the structure.
  });

  it("covers removing hook", async () => {
    expect(hook_id).to.be.a('string');
    await test.remove_hook(testapp, hook_id)
  });

  it("ensures we clean up after ourselves.", async () => {
    await test.delete_app(testapp)
    server.close();
  });
});
