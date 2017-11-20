"use strict"

process.env.PORT = 5000;
process.env.DEFAULT_PORT = "5000";
process.env.AUTH_KEY = 'hello';
process.env.ENCRYPT_KEY = 'hello';
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};
const http = require('http');

function wait_for_app(httph, app, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 180) {
    process.stdout.write("\n");
    callback({code:0, message:"Timeout waiting for app to turn up."});
  }
  httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN, {'X-Timeout':1500}, null, (err, data) => {
    if(err) {
      process.stdout.write(".");
      setTimeout(wait_for_app.bind(null, httph, app, callback, (iteration + 1)), 500);
      //callback(err, null);
    } else {
      process.stdout.write("\n");
      callback(null, data);
    }
  });
}

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
      if(build_info.status === 'pending') {
        process.stdout.write(".");
        setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
      } else {
        process.stdout.write("\n");
        callback(null, data);
      }
    }
  });
}

describe("hooks:", function() {
  this.timeout(100000);
  const running_app = require('../index.js');
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000);
  let build_id = null;


  let hook_assert_state = 'build';
  let hook_callback = null;
  function handle_hook_call(req, res) {
    if(hook_callback) {
      hook_callback(req,res);
    } else {
      console.warn("WARNING: Hook called with no handler assigned!");
    }
  }

  let hook_listener = http.createServer(handle_hook_call).on('clientError', (err, socket) => {
    console.error('client socket error:', err);
  });
  hook_listener.listen(8000);

  let placed_hooks = false;

  it("covers creating a an app and a hook", (done) => {
    // create an app.
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}),
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/hooks', alamo_headers,
        JSON.stringify({
          "url":"http://localhost:8000/webhook",
          "events":[
            "release",
            "build",
            "formation_change",
            "logdrain_change",
            "addon_change",
            "config_change",
            "destroy"
          ],
          "active":true,
          "secret":"some secret for hash"
        }), (err, data) => {
          if(err) {
            console.log('error placing hook:', err);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          data = JSON.parse(data);
          expect(data.events).to.be.an('array');
          expect(data.url).to.be.a('string');
          expect(data.id).to.be.a('string');
          placed_hooks = true;
          done();
        })
    });
  });

  it("covers firing build webhooks", (done) => {
    expect(placed_hooks).to.equal(true);
    // create a build and assign the build pending hook listener
    let pending_build_success = false;
    hook_callback = function (req, res) { //hook_pending_cb
      let data = new Buffer(0);
      req.on('data', (chunk) => data = Buffer.concat([data, chunk]));
      req.on('end', () => {
        let payload = JSON.parse(data.toString('utf8'));
        expect(payload.build.result).to.equal('pending');
        pending_build_success = true;
        res.end();

        let build_success = false;
        hook_callback = function (req, res) {
          let data = new Buffer(0);
          req.on('data', (chunk) => data = Buffer.concat([data, chunk]));
          req.on('end', () => {
            let payload = JSON.parse(data.toString('utf8'));
            expect(payload.build.result).to.equal('succeeded');
            build_success = true;
            res.end();
            done();
          });
        };
      });
    };

    let build_payload = {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-hooks:latest"};
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload), (err, build_info) => {
      expect(err).to.be.null;
      expect(build_info).to.be.a('string');
      let build_obj = JSON.parse(build_info);
      expect(build_obj.id).to.be.a('string');
      build_id = build_obj.id;
      // wait for the build to succeed
      wait_for_build(httph, appname_brand_new + '-default', build_obj.id, (wait_err, building_info) => {
        if(wait_err) {
          console.error("Error waiting for build:", wait_err);
          return expect(true).to.equal(false);
        }
      });
    });
  });


  let release_succeeded = false;
  let release_id = null;
  it("covers firing release hooks", (done) => {
    expect(placed_hooks).to.equal(true);
    let release_hook_success = false;
    hook_callback = function (req, res) {
      let data = new Buffer(0);
      req.on('data', (chunk) => data = Buffer.concat([data, chunk]));
      req.on('end', () => {
        let payload = JSON.parse(data.toString('utf8'));
        expect(payload.release).to.be.an('object');
        expect(payload.release.result).to.equal('succeeded');
        release_hook_success = true;
        expect(release_succeeded).to.equal(true);
        res.end();
        done();
      });
    };

    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/releases', alamo_headers, JSON.stringify({"slug":build_id,"description":"Deploy " + build_id}), (err, release_info) => {
      if(err) {
        console.log('release error:', err);
      }
      expect(err).to.be.null;
      expect(release_info).to.be.a('string');
      let release_res = JSON.parse(release_info);
      expect(release_res.id).to.be.a('string');
      expect(release_res.status).to.equal("succeeded");
      release_id = release_res.id;
      release_succeeded = true;
    });
  });

  it("covers firing formation change hooks", (done) => {
    expect(release_succeeded).to.equal(true);
    expect(placed_hooks).to.equal(true);
    let release_hook_success = false;
    hook_callback = function (req, res) {
      let data = new Buffer(0);
      req.on('data', (chunk) => data = Buffer.concat([data, chunk]));
      req.on('end', () => {
        let payload = JSON.parse(data.toString('utf8'));
        expect(payload.change).to.equal('update');
        expect(payload.changes).to.be.an('array');
        expect(payload.changes[0].type).to.equal('web');
        expect(payload.changes[0].quantity).to.equal(2);
        res.end();
        done();
      });
    };
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers,
      JSON.stringify([{"type":"web","quantity":2,"size":"constellation"}]),
      (err, formation_info) => {
      if(err) {
        console.log('release error:', err);
      }
      expect(err).to.be.null;
      expect(formation_info).to.be.a('string');
    });
  });




  let hook_id = null;
  it("covers listing hooks", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/hooks', alamo_headers, null, (err, hook_info) => {
      if(err) {
        console.log('hook error:', err);
      }
      expect(err).to.be.null;
      expect(hook_info).to.be.a('string');
      hook_info = JSON.parse(hook_info);
      expect(hook_info).to.be.an('array');
      expect(hook_info.length).to.equal(1);
      hook_info = hook_info[0];
      expect(hook_info.id).to.be.a('string');
      hook_id = hook_info.id;
      expect(hook_info.events).to.be.an('array');
      expect(hook_info.url).to.be.a('string');
      expect(hook_info.created_at).to.be.a('string');
      expect(hook_info.updated_at).to.be.a('string');
      done();
    });
  });

  it("covers getting hook info", (done) => {
    expect(hook_id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/hooks/' + hook_id, alamo_headers, null, (err, hook_info) => {
      if(err) {
        console.log('hook error:', err);
      }
      expect(err).to.be.null;
      expect(hook_info).to.be.a('string');
      hook_info = JSON.parse(hook_info);
      expect(hook_info.id).to.be.a('string');
      expect(hook_info.id).to.equal(hook_id);
      expect(hook_info.events).to.be.an('array');
      expect(hook_info.url).to.be.a('string');
      expect(hook_info.created_at).to.be.a('string');
      expect(hook_info.updated_at).to.be.a('string');
      done();
    });
  });

  it("covers removing hook", (done) => {
    expect(hook_id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/hooks/' + hook_id, alamo_headers, null, (err, hook_info) => {
      if(err) {
        console.log('hook error:', err);
      }
      expect(err).to.be.null;
      done();
    });
  });

  it("ensures we clean up after ourselves.", (done) => {
    // destroy the app.
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      hook_listener.close();
      done();
    });
  });
});