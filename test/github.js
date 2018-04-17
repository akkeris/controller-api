"use strict"

process.env.TEST_MODE = "true"
const init = require('./support/init.js');
describe("github: ensure we can attach auto builds, submit auto builds, and remove auto builds.", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";

  function wait_for_build(httph, app, build_id, callback, iteration) {
    iteration = iteration || 1;
    if(iteration === 1) {
      process.stdout.write("    ~ Waiting for build");
    }
    httph.request('get', 'http://localhost:5000/apps/' + app + '/builds/' + build_id, alamo_headers, null, (err, data) => {
      if(err && err.code === 423) {
        process.stdout.write(".");
        setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
      } else if(err) {
        callback(err, null);
      } else {
        let build_info = JSON.parse(data);
        if(build_info.status === 'pending' || build_info.status === 'queued') {
          process.stdout.write(".");
          setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
        } else {
          process.stdout.write("\n");
          callback(null, data);
        }
      }
    });
  }

  const fs = require('fs')
  const httph = require('../lib/http_helper.js')
  const git = require('../lib/git.js')
  const expect = require("chai").expect
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "x-username":"test", "x-elevated-access":"true"}
  const app_name = "alamotest" + Math.round(Math.random() * 10000)
  const webhook201 = fs.readFileSync('./test/support/github-webhook-success-201.json').toString('utf8')
  const webhook205branch = fs.readFileSync('./test/support/github-webhook-fail-wrong-branch.json').toString('utf8')
  const webhook205type = fs.readFileSync('./test/support/github-webhook-fail-wrong-type.json').toString('utf8')
  const webhookEmpty = fs.readFileSync('./test/support/github-webhook-empty-commit.json').toString('utf8')


  it("ensure we can create an app", async (done) => {
    try {
      let req_data = JSON.stringify({org:"test", space:"default", name:app_name, size:"constellation", quantity:1, "type":"web", port:9000})
      let data = await httph.request('post', 'http://localhost:5000/apps', {"Authorization":process.env.AUTH_KEY}, req_data)
      done()
    } catch (e) {
      done(e)
    }
  });

  it("ensure we can add an auto build", async (done) => {
    try {
      let req_data = JSON.stringify({repo:"https://github.com/akkeris/controller-api", branch:"master", status_check:"true", auto_deploy:"true", username:"test", token:"ab832239defaa3298438abb"})
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto`, {"Authorization":process.env.AUTH_KEY}, req_data)
      data = JSON.parse(data.toString())
      expect(data.status).to.equal("successful")
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure if we cannot add an existing auto build if a hook already exists", async (done) => {
    try {
      let req_data = JSON.stringify({repo:"https://github.com/akkeris/controller-api", branch:"master", status_check:"true", auto_deploy:"true", username:"test", token:"existing"})
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto`, {"Authorization":process.env.AUTH_KEY, 'x-ignore-errors':'true'}, req_data)
      expect(data).to.be.undefined;
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure we do not kick off a build on the wrong branch", async (done) => {
    try {
      let incoming = JSON.stringify(JSON.parse(webhook205branch))
      let hash = git.calculate_hash("testing", incoming)
      let headers = {'x-github-event':'push', 'x-hub-signature':hash}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      expect(data.toString('utf8')).to.equal('This webhook took place on a branch that isnt of interest.')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure empty pushes do not cause us to fail.", async (done) => {
    try {
      let incoming = JSON.stringify(JSON.parse(webhookEmpty))
      let hash = git.calculate_hash("testing", incoming)
      let headers = {'x-github-event':'push', 'x-hub-signature':hash}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      expect(data.toString('utf8')).to.equal('This webhook was not an event that had any affect.')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure we politely respond, but do not kick off a build for pull requests", async (done) => {
    // note we check for only one build later. 
    try {
      let incoming = JSON.stringify(JSON.parse(webhook205type))
      let hash = git.calculate_hash("testing", incoming)
      let headers = {'x-github-event':'pull_request', 'x-hub-signature':hash}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      let json_data = JSON.parse(data.toString('utf8'))
      expect(json_data.code).to.equal(201)
      expect(json_data.message).to.equal('Roger that, message received.')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure we do not kick off a build on an invalid type", async (done) => {
    try {
      let incoming = JSON.stringify(JSON.parse(webhook205type))
      let hash = git.calculate_hash("testing", incoming)
      let headers = {'x-github-event':'fugazi', 'x-hub-signature':hash}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      expect(data.toString('utf8')).to.equal('This webhook was not an event that were interested in.')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure we do not kick off anything if the key is invalid (w/invalid event)", async (done) => {
    try {
      let incoming = JSON.stringify(JSON.parse(webhook205type))
      let hash = git.calculate_hash("foo", incoming)
      let headers = {'x-github-event':'fugazi', 'x-hub-signature':hash, 'x-ignore-errors':'true'}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      expect(data.toString('utf8')).to.equal('This webhook was not an event that were interested in.')
      done(new Error("this shouldnt happen"))
    } catch (e) {
      done()
    }
  })

  it("ensure we do not kick off anything if the key is invalid (w/valid event)", async (done) => {
    try {
      let incoming = JSON.stringify(JSON.parse(webhook205type))
      let hash = git.calculate_hash("foo", incoming)
      let headers = {'x-github-event':'push', 'x-hub-signature':hash, 'x-ignore-errors':'true'}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      expect(data.toString('utf8')).to.equal('This webhook was not an event that were interested in.')
      done(new Error("this shouldnt happen"))
    } catch (e) {
      done()
    }
  })

  it("ensure we can kick off an auto-build with github", async (done) => {
    try {
      let incoming = JSON.stringify(JSON.parse(webhook201))
      let hash = git.calculate_hash("testing", incoming)
      let headers = {'x-github-event':'push', 'x-hub-signature':hash}
      let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming)
      let json_data = JSON.parse(data.toString('utf8'))
      expect(json_data.code).to.equal(201)
      expect(json_data.message).to.equal('Roger that, message received.')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure we can see the builds running from github hook", async (done) => {
    try {
      let wait = 0
      let data = null
      do {
        await (async function() { return new Promise((res, rej) => { setTimeout(() => { res() }, 500) }) })()
        data = await httph.request('get', `http://localhost:5000/apps/${app_name}-default/builds`, {"Authorization":process.env.AUTH_KEY}, null)
        data = JSON.parse(data.toString())
        expect(data).to.be.an('array')
        wait++
      } while (data.length === 0 && wait < 20)
      expect(data.length).to.equal(1)
      expect(data[0].source_blob.checksum).to.equal('already-validated-auto-build')
      expect(data[0].source_blob.author).to.equal('John Smith (johnsmith)')
      expect(data[0].source_blob.commit).to.equal('3f20df245a9f25de290a6d2c2546960ba6fa40c8')
      expect(data[0].source_blob.version).to.equal('https://github.com/akkeris/controller-api/commit/3f20df245a9f25de290a6d2c2546960ba6fa40c8')
      expect(data[0].source_blob.message).to.equal('Merge pull request #29 from akkeris/controller-api-1610b\n\nEXAMPLE-1610b - fix for auto validations')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("ensure we clean up after ourselves", (done) => {
    httph.request('delete', `http://localhost:5000/apps/${app_name}-default`, alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      done();
    });
  });
});
