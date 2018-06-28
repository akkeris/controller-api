"use strict"

process.env.PORT = 5000;
process.env.DEFAULT_PORT = "5000";
process.env.AUTH_KEY = 'hello';
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};


function wait_for_app_content(httph, app, content, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 120) {
    process.stdout.write("\n");
    callback({code:0, message:"Timeout waiting for app to turn up."});
  }
  setTimeout(function() {
    httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN, {'X-Timeout':1500}, null, (err, data) => {
      if(err || data.indexOf(content) === -1) {
        process.stdout.write(".");
        setTimeout(wait_for_app_content.bind(null, httph, app, content, callback, (iteration + 1)), 250);
        //callback(err, null);
      } else {
        process.stdout.write("\n");
        callback(null, data);
      }
    });
  },500);
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


const init = require('./support/init.js');

describe("releases: list, get, create a release", function() {
  this.timeout(200000);
  const httph = require('../lib/http_helper.js');
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

  it("covers listing releases, ensures we have a current release", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/releases', alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach(validate_release_object)
        //expect(obj.filter((x) => { return x.current === true }).length).to.equal(1)
        done();
    });
  });
  it("covers getting release info", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/releases', alamo_headers, null,
      (err, data) => {
        let objs = JSON.parse(data);
        expect(err).to.be.null;
        expect(objs).to.be.an('array');
        httph.request('get', 'http://localhost:5000/apps/api-default/releases/' + objs[0].id, alamo_headers, null,
          (err, release_info) => {
            expect(err).to.be.null;
            let obj = JSON.parse(release_info);
            validate_release_object(obj);
            done();
        });
    });
  });
  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000);
  let build_id = null;

  it("covers creating a build to release", function(done) {
    this.timeout(0)
    // create an app.
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}),
    (err, data) => {
      //, size:"constellation", quantity:1, "type":"web", port:5000

      expect(err).to.be.null;
      expect(data).to.be.a('string');
      // create a build
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
          done();
        });
      });
    });
  });

  let release_succeeded = false;
  let release_id = null;
  it("covers creating a release from the build", (done) => {
    expect(build_id).to.be.a.string;
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/releases', alamo_headers, JSON.stringify({"slug":build_id,"description":"Deploy " + build_id}), (err, release_info) => {
      if(err) {
        console.log('release error:', err);
      }
      expect(err).to.be.null;
      expect(release_info).to.be.a('string');
      let release_res = JSON.parse(release_info);
      expect(release_res.id).to.be.a('string');
      expect(release_res.status).to.equal("succeeded");
      validate_release_object(release_res);
      release_id = release_res.id;
      release_succeeded = true;

      // The app should turn up, it has about 10 seconds before a failure will occur.
      done();
    });
  });

  it("covers audit events for a feature", (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app=' + appname_brand_new + '&space=default', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.some((x)=> x.action === 'release')).to.eql(true);
        done();
    });
    }, 5000);
  });

  it("covers ensuring release causes an app at expected host to turn up", function(done) {
    this.timeout(0)
    expect(release_succeeded).to.equal(true)
    setTimeout(function() {
      wait_for_app_content(httph, appname_brand_new, 'hello', (wait_app_err, resp) => {
        if(wait_app_err) {
          console.log('waiting for app err:', wait_app_err);
        }
        // ensure we get the response "hello", so we know its our app that turned up.
        expect(resp).to.equal('hello');
        expect(wait_app_err).to.be.null;
        done();
      });
    },1000);
  });

  it("covers putting up and taking down maintenance pages", async function(done) {
      try {
          var payload = {}
          payload.maintenance = true
          let maint_info_on = JSON.parse(await httph.request('patch', `http://localhost:5000/apps/${appname_brand_new}-default`, alamo_headers, JSON.stringify(payload)))
          expect(maint_info_on.maintenance).to.equal(true)
          wait_for_app_content(httph, appname_brand_new, 'System Maintenance', async (wait_app_err, resp) => {
            payload.maintenance = false
            let maint_info_off = JSON.parse(await httph.request('patch', `http://localhost:5000/apps/${appname_brand_new}-default`, alamo_headers, JSON.stringify(payload)))
            expect(maint_info_off.maintenance).to.equal(false)
            wait_for_app_content(httph, appname_brand_new, 'hello', (wait_app_err, resp) => {
                if (wait_app_err) {
                    console.log('waiting for app err:', wait_app_err);
                }
                // ensure we get the response "hello", so we know its our app that turned up.
                expect(resp).to.equal('hello');
                expect(wait_app_err).to.be.null;
                done();
            });
          })
      } catch (e) {
          done(e)
      }
  })

  it("ensure we can restart the app", (done) => {
    expect(release_succeeded).to.equal(true);
    // ensure we can restart the app.
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  // TODO: this test is inadequate
  it("ensure we can rollback the app", (done) => {
      expect(release_succeeded).to.equal(true);
      // ensure we can rollback the app.
      httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/releases', alamo_headers, JSON.stringify({"release":release_id}), (rollback_err, rollback_info) => {
        expect(rollback_err).to.be.null;
        expect(rollback_info).to.be.a('string');
        let obj = JSON.parse(rollback_info);
        validate_release_object(obj);
        //expect(obj.build.id).to.equal(build_id)
        done();
      });
  });


  it("image is available", (done) => {
    // get the app.
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let describeobj = JSON.parse(data);
      expect(describeobj.image).to.be.a('string')
      expect(describeobj.image).to.not.be.null
      done();
    });
  })


  it("ensures we clean up after ourselves.", (done) => {
    // destroy the app.
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  })

});
