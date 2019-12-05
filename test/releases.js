"use strict"

process.env.PORT = 5000;
process.env.DEFAULT_PORT = "5000";
process.env.AUTH_KEY = 'hello';

const support = require('./support/init.js');
const expect = require("chai").expect;

function validate_release_object(obj) {
  expect(obj).is.an('object')
  expect(obj.app).is.an('object')
  expect(obj.app.name).is.a('string')
  expect(obj.created_at).is.a('string')
  expect(obj.description).is.a('string')
  expect(obj.slug).is.an('object')
  expect(obj.id).is.a('string')
  expect(obj.status).is.a('string')
  expect(obj.user).is.an('object')
  expect(obj.user.id).is.a('string')
  expect(obj.user.email).is.a('string')
  expect(obj.version).is.a('number')
}
function validate_release_status_object(obj) {
  expect(obj).is.an('object');
  expect(obj.id).is.a('string');
  expect(obj.name).is.a('string');
  expect(obj.created_at).is.a('string');
  expect(obj.description).is.a('string');
  expect(obj.updated_at).is.a('string');
  expect(obj.context).is.a('string');
  expect(obj.image_url).is.a('string');
  expect(obj.target_url).is.a('string');
}

describe("releases: list, get, create a release", function() {
  this.timeout(0);
  const httph = require('../lib/http_helper.js');

  let test_app = null;
  let test_build = null;
  let release_succeeded = false;
  let release_id = null;
  let release_status_id = null;

  it("covers parsing command args from end point", (done) => {
    let c = require('../lib/common.js');
    let args = c.alamo.parse_command_args("node --foo=23423 --asdfasd=\"asdfasdfasdfasd\" -d  \"asdf asdf asdf\" abcd");
    expect(args).to.be.an('array');
    expect(args[0]).to.equal('node');
    expect(args[1]).to.equal('--foo=23423')
    expect(args[2]).to.equal('--asdfasd="asdfasdfasdfasd"')
    expect(args[3]).to.equal('-d asdf asdf asdf')
    expect(args[4]).to.equal('abcd')
    done();
  });

  it("covers creating a build to release", async () => {
    test_app = await support.create_test_app();
    test_build = await support.create_build(test_app, "docker://docker.io/akkeris/test-hooks:latest", null, "sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756", "123456", "akkeris", "https://github.com/abcd/some-repo", "master", "v1.0");
    // create a build
    expect(test_build.id).to.be.a('string');
    // wait for the build to succeed
    let building_info = await support.wait_for_build(test_app, test_build);
  });

  it("covers creating a release from the build", async () => {
    expect(test_app).to.not.be.null;
    expect(test_build).to.not.be.null;
    let release_info = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${test_app.id}/releases`, support.alamo_headers, JSON.stringify({"slug":test_build.id,"description":"Deploy " + test_build.id})));
    expect(release_info.id).to.be.a('string');
    expect(release_info.status).to.equal("queued");
    validate_release_object(release_info);
    release_id = release_info.id;
    release_succeeded = true;
    // wait for the release audit event to propogate to elasticsearch.
    await support.wait(1000);
  });

  it("covers listing releases, ensures we have a current release", async () => {
    let obj = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases`, support.alamo_headers, null));
    expect(obj).to.be.an('array');
    obj.forEach(validate_release_object);
  });

  it("covers getting release info", async () => {
    let objs = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases`, support.alamo_headers, null));
    expect(objs).to.be.an('array');
    validate_release_object(JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases/${objs[0].id}`, support.alamo_headers, null)));
  });

  it("covers audit events for a feature", async () => {
    let obj = JSON.parse(await httph.request('get', `http://localhost:5000/audits?app=${test_app.simple_name}&space=${test_app.space.name}`, support.alamo_headers, null));
    expect(obj).to.be.an('array');
    expect(obj.some((x)=> x.action === 'release')).to.eql(true);
  });

  it("covers ensuring release causes an app at expected host to turn up", async () => {
    expect(release_succeeded).to.equal(true);
    await support.wait(1000);
    let resp = await support.wait_for_app_content(test_app.web_url, 'hello');
    expect(resp).to.equal('hello');
  });

  it("ensure we can restart the app", async () => {
    expect(release_succeeded).to.equal(true);
    // ensure we can restart the app.
    await httph.request('delete', `http://localhost:5000/apps/${test_app.id}/dynos`, support.alamo_headers, null);
  });

  // TODO: this test is inadequate
  it("ensure we can rollback the app", async () => {
    expect(release_succeeded).to.equal(true);
    // ensure we can rollback the app.
    validate_release_object(JSON.parse(await httph.request('post', `http://localhost:5000/apps/${test_app.id}/releases`, support.alamo_headers, JSON.stringify({"release":release_id}))));
  });

  it("ensure we get a reasonable error with an invalid release id on rollback of an app", async () => {
    expect(release_succeeded).to.equal(true);
    try {
      await httph.request('post', `http://localhost:5000/apps/${test_app.id}/releases`, {"x-silent-error":true, ...support.alamo_headers}, JSON.stringify({"release":"12345"}));
      expect(true).to.be(false);
    } catch (e) {
      // do nothing
    }
  });

  it("expect the image property to be available", async () => {
    let app = await support.get_app(test_app);
    expect(app.image).to.be.a('string');
    expect(app.image).to.not.be.null;
  });


  it("ensure the release statuses is an empty array.", async () => {
    let statuses = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, support.alamo_headers));
    expect(statuses.state).to.equal("success")
    expect(statuses.statuses.length).to.equal(0);
  });

  it("ensure we can create a release status.", async () => {
    let status = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, support.alamo_headers, {"state":"pending", "name":"status123", "context":"group/status123", "description":"This is my status", "image_url":"https://example.com/image.png", "target_url":"https://example.com/statuses"}));
    validate_release_status_object(status);
  });

  it("ensure we cannot create invalid statuses", async () => {
    try {
      await httph.request('post', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, {"x-silent-error":true, ...support.alamo_headers}, 
        {
          "state":"foobar", 
          "name":"status123", 
          "context":"group/status123", 
          "description":"This is my status", 
          "image_url":"https://example.com/image.png", 
          "target_url":"https://example.com/statuses"
        });
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.message).to.equal("Invalid state: The state must be \"error\", \"failure\", \"pending\" or \"success\".");
    }
  });

  it("ensure we cannot create invalid contexts", async () => {
    try {
      await httph.request('post', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, {"x-silent-error":true, ...support.alamo_headers}, 
        {
          "state":"pending", 
          "name":"status123", 
          "context":"invalid context", 
          "description":"This is my status", 
          "image_url":"https://example.com/image.png", 
          "target_url":"https://example.com/statuses"
        });
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.message).to.equal("Invalid context name: The context name must be alpha numeric and can contain the characters /\\+-.");
    }
  });

  it("ensure we can list a release status.", async () => {
    let obj = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, support.alamo_headers, null));
    expect(obj.statuses.length).to.equal(1);
    validate_release_status_object(obj.statuses[0]);
    expect(obj.statuses[0].state).to.equal("pending");
    expect(obj.statuses[0].name).to.equal("status123");
    expect(obj.statuses[0].context).to.equal("group/status123");
    expect(obj.statuses[0].description).to.equal("This is my status");
    expect(obj.statuses[0].image_url).to.equal("https://example.com/image.png");
    expect(obj.statuses[0].target_url).to.equal("https://example.com/statuses");
    expect(obj.state).to.equal("pending");
    expect(obj.release).to.be.an("object");
    release_status_id = obj.statuses[0].id;
  });

  it("ensure we can get a release status.", async () => {
    expect(release_status_id).to.not.be.null;
    let status = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses/${release_status_id}`, support.alamo_headers, null));
    validate_release_status_object(status);
    expect(status.id).to.equal(release_status_id);
    expect(status.state).to.equal("pending");
    expect(status.name).to.equal("status123");
    expect(status.context).to.equal("group/status123");
    expect(status.description).to.equal("This is my status");
    expect(status.image_url).to.equal("https://example.com/image.png");
    expect(status.target_url).to.equal("https://example.com/statuses");

    let statuses = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, support.alamo_headers));
    expect(statuses.state).to.equal("pending");
    
  });

  it("ensure we can update a release status.", async () => {
    expect(release_status_id).to.not.be.null;
    let status = JSON.parse(await httph.request('patch', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses/${release_status_id}`, support.alamo_headers, JSON.stringify({"state":"success"})));
    validate_release_status_object(status);
    expect(status.id).to.equal(release_status_id);
    expect(status.state).to.equal("success");
    expect(status.name).to.equal("status123");
    expect(status.context).to.equal("group/status123");
    expect(status.description).to.equal("This is my status");
    expect(status.image_url).to.equal("https://example.com/image.png");
    expect(status.target_url).to.equal("https://example.com/statuses");

    let statuses = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses`, support.alamo_headers));
    expect(statuses.state).to.equal("success");
  });

  it("ensure we cannot update a context.", async () => {
    expect(release_status_id).to.not.be.null;
    try {
      await httph.request('patch', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses/${release_status_id}`, {"x-silent-error":true, ...support.alamo_headers}, 
        JSON.stringify({"context":"foobar/fee", "state":"success"}));
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.message).to.equal("Invalid parameter: the context of the status may not be renamed or changed.");
    }
  });

  it("ensure we cannot update a state to an invalid one.", async () => {
    expect(release_status_id).to.not.be.null;
    try {
      await httph.request('patch', `http://localhost:5000/apps/${test_app.id}/releases/${release_id}/statuses/${release_status_id}`, {"x-silent-error":true, ...support.alamo_headers}, 
        JSON.stringify({"state":"foobar"}));
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.message).to.equal("Invalid state: The state must be \"error\", \"failure\", \"pending\" or \"success\".");
    }
  });

  it("ensures we clean up after ourselves.", async () => {
    await support.delete_app(test_app);
  });

});
