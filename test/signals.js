
process.env.TEST_MODE = "true";
process.env.PORT = "5000";
process.env.AUTH_KEY = 'hello';

const request = require('../lib/http_helper.js').request
const test = require('./support/init.js');
const expect = require("chai").expect;

describe("signals and executing debug commands", function() {
  this.timeout(10000000);
  let signalsapp = null;
  let dynos = [];
  it("setup: provision resources", async () => {
    signalsapp = await test.create_test_app("preview");
    let build = await test.create_build(signalsapp, "docker://docker.io/akkeris/test-signals:latest", null, "sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756", "123456", "test", "https://github.com/abcd/some-repo", "master", "v1.0");
    await test.wait_for_build(signalsapp, build.id);
    await test.wait_for_app_content(signalsapp.web_url, '{}');    
    dynos = JSON.parse(await request('get', `http://localhost:5000/apps/${signalsapp.id}/dynos`, test.alamo_headers, null))    
  });
  
  it("test no signals have been triggered", async () => {
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null))
    expect(Object.keys(signals).length).to.equal(0);
  });

  it("test that SIGHUP is sent and triggered", async () => {
    await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, test.alamo_headers, JSON.stringify({"command":["sh", "-c", "kill -1 -1"], "stdin":""}));
    await test.wait(1000);
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null));
    expect(Object.keys(signals).length).to.equal(1);
    expect(signals["SIGHUP"]).to.equal(true);
  });

  it("test that SIGINT is sent and triggered", async () => {
    await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, test.alamo_headers, JSON.stringify({"command":["sh", "-c", "kill -2 -1"], "stdin":""}))
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null))
    expect(Object.keys(signals).length).to.equal(2);
    expect(signals["SIGHUP"]).to.equal(true);
    expect(signals["SIGINT"]).to.equal(true);
  });

  it("test that SIGTERM is sent and triggered", async () => {
    await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, test.alamo_headers, JSON.stringify({"command":["sh", "-c", "kill -15 -1"], "stdin":""}))
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null))
    expect(Object.keys(signals).length).to.equal(3);
    expect(signals["SIGHUP"]).to.equal(true);
    expect(signals["SIGINT"]).to.equal(true);
    expect(signals["SIGTERM"]).to.equal(true);
  });

  it("test that SIGQUIT is sent and triggered", async () => {
    await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, test.alamo_headers, JSON.stringify({"command":["sh", "-c", "kill -3 -1"], "stdin":""}))
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null))
    expect(Object.keys(signals).length).to.equal(4);
    expect(signals["SIGHUP"]).to.equal(true);
    expect(signals["SIGINT"]).to.equal(true);
    expect(signals["SIGTERM"]).to.equal(true);
    expect(signals["SIGQUIT"]).to.equal(true);
  });

  it("test that SIGABRT is sent and triggered", async () => {
    await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, test.alamo_headers, JSON.stringify({"command":["sh", "-c", "kill -6 -1"], "stdin":""}))
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null))
    expect(Object.keys(signals).length).to.equal(5);
    expect(signals["SIGHUP"]).to.equal(true);
    expect(signals["SIGINT"]).to.equal(true);
    expect(signals["SIGTERM"]).to.equal(true);
    expect(signals["SIGQUIT"]).to.equal(true);
    expect(signals["SIGABRT"]).to.equal(true);
  });

  it("test that SIGABRT is sent and triggered", async () => {
    await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, test.alamo_headers, JSON.stringify({"command":["sh", "-c", "kill -10 -1"], "stdin":""}))
    let signals = JSON.parse(await request('get', signalsapp.web_url, {}, null))
    expect(Object.keys(signals).length).to.equal(6);
    expect(signals["SIGHUP"]).to.equal(true);
    expect(signals["SIGINT"]).to.equal(true);
    expect(signals["SIGTERM"]).to.equal(true);
    expect(signals["SIGQUIT"]).to.equal(true);
    expect(signals["SIGABRT"]).to.equal(true);
    expect(signals["SIGUSR1"]).to.equal(true);
  });

  it("test to ensure signals cannot be sent to unknown dynos", async () => {
    try {
      await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/does-not-exist/actions/attach`, {"x-silent-error":"true", ...test.alamo_headers}, JSON.stringify({"command":["sh", "-c", "kill -10 -1"], "stdin":""}));
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.code).to.equal(404);
    }
  })

  it("test to ensure commands that are not allowed cannot be sent.", async () => {
    try {
      await request('post', `http://localhost:5000/apps/${signalsapp.id}/dynos/web.${dynos[0].name}/actions/attach`, {"x-silent-error":"true", ...test.alamo_headers}, JSON.stringify({"command":["ssh","-1","-1"], "stdin":""}))
      expect(false).to.equal(true);
    } catch (e) {
      expect(e.code).to.equal(403);
    }
  });

  it("clean-up signals test", async() => {
    await test.remove_app(signalsapp);
  });
});