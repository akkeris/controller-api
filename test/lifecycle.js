"use strict"

process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const init = require('./support/init.js')
const httph = require('../lib/http_helper.js');
const expect = require("chai").expect;
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};

function wait_for_app_content(httph, app, content, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 60) {
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
  },1000);
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

describe("lifecycle: ensure apps restart at appropriate times.", function() {  
  this.timeout(300000);
  process.env.DEFAULT_PORT = "9000";
  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000);
  let build_info
  it("covers getting dyno list.", function(done) {
    this.timeout(0);
    // create an app.
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}), 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      // make a build with the wrong port.
      let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-lifecycle:latest"};
      httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload), (err, info) => {
        expect(err).to.be.null;
        expect(info).to.be.a('string');
        build_info = JSON.parse(info);
        wait_for_build(httph, appname_brand_new + '-default', build_info.id, (wait_err, building_info) => {
          if(wait_err) {
            console.error("Error waiting for build:", wait_err);
            return expect(true).to.equal(false);
          }
          httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/releases', alamo_headers, JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id}), (err, release_info) => {
            if(err) {
              console.log('release error:', err);
            }
            expect(err).to.be.null;
            expect(release_info).to.be.a('string');
            done();
          });
        });
      });
    });
  });

  // test changing the port, ensure it restarts and comes up (and is down before.)
  it("ensure app does not respond to default port (9000).", (done) => {
    // theres no real way to know if the app is down or up or ready or not, well.. sort of. but either way we'll give it a second
    // to actually come up, at this point we should just get a timeout.
    setTimeout(function() {
      let timeout_headers = JSON.parse(JSON.stringify(alamo_headers))
      timeout_headers['X-Timeout'] = 5000;
      httph.request('get','https://' + appname_brand_new + process.env.ALAMO_BASE_DOMAIN, timeout_headers, null, (err, data) => {
        expect(err).to.be.an('object');
        done();
      });
    }, 250);
  });

  it("change port on application via formations batch update", (done) => {
    // submit a change to the port.
    let changes = [{port:5000,type:"web"}]
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers, JSON.stringify(changes), (err, info) => {
      if(err) {
        console.log('err on batch updates:', err);
      }
      expect(err).to.be.null;
      expect(info).to.be.a('string');
      done();
    });
  });

  // Now that we changed the port, the app should turn up by itself (and automatically be restarted/redeployed.)
  it("ensure app comes back up after changing its port to the correct value (5000).", function(done) {
    this.timeout(0);
    wait_for_app_content(httph, appname_brand_new, '[setting return value failed.] with port [5000] and restart value [undefined]', (wait_app_err, resp) => {
      if(wait_app_err) {
        console.log('waiting for app err:', wait_app_err);
      }
      // ensure we get the response "hello", so we know its our app that turned up.
      expect(resp).to.equal('[setting return value failed.] with port [5000] and restart value [undefined]')
      expect(wait_app_err).to.be.null;
      done();
    });
  });

  // test changing config env's make sure it restarts the server
  it("ensure app restarts and reloads config when changing config vars", function(done) {
    this.timeout(0);
    // add a config var
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({RETURN_VALUE:"FOOBAR"}), (err, data) => {
      expect(err).to.be.null;
      wait_for_app_content(httph, appname_brand_new, '[FOOBAR]', (wait_app_err, resp) => {
        if(wait_app_err) {
          console.log(wait_app_err);
        }
        // ensure we get the response "hello", so we know its our app that turned up.
        expect(resp).to.contain('[FOOBAR]')
        expect(wait_app_err).to.be.null;
        done();
      });
    });
  });

  var dyno_name = null
  it("ensure app shows a running dyno.", (done) => {
    setTimeout(function() {
      httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos', alamo_headers, null, (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        expect(data).to.be.an('array');
        expect(data[0]).to.be.a('object');
        expect(data[0].command).to.be.null;
        expect(data[0].created_at).to.be.a.string;
        expect(data[0].id).to.be.a.string;
        expect(data[0].name).to.be.a.string;
        expect(data[0].release).to.be.an('object');
        expect(data[0].app).to.be.an('object');
        expect(data[0].size).to.be.a('string');
        expect(data[0].state).to.be.a('string');
        expect(data[0].type).to.equal("web");
        expect(data[0].updated_at).to.be.a('string');
        dyno_name = data[0].name;
        done();
      });
    },1000);
  });

  it("get info on a specific dyno type.", (done) => {
    expect(dyno_name).to.be.a.string;
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos/' + dyno_name, alamo_headers, null, (err, data) => {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.a('object');
      expect(data.command).to.be.null;
      expect(data.created_at).to.be.a.string;
      expect(data.id).to.be.a.string;
      expect(data.name).to.be.a.string;
      expect(data.release).to.be.an('object');
      expect(data.app).to.be.an('object');
      expect(data.size).to.be.a('string');
      expect(data.state).to.be.a('string');
      expect(data.type).to.equal("web");
      expect(data.updated_at).to.be.a('string');
      done();
    });
  });

  it("restart specific dyno", (done) => {
    expect(dyno_name).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos/web.' + dyno_name, alamo_headers, null, (err, data) => {
      if(err) {
        console.log('error restarting dyno type', dyno_name);
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.type).to.equal('web');
      expect(data.dyno).to.equal(dyno_name);
      done();
    });
  });

  it("update quantity of a dyno type", (done) => {
    expect(dyno_name).to.be.a('string');
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation/web', alamo_headers, JSON.stringify({'quantity':2}), (err, data) => {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.an('string');
      data = JSON.parse(data);
      expect(data.quantity).to.equal(2);
      done();
    });
  });

  it("restart unknown dyno", (done) => {
    expect(dyno_name).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos/foobar', alamo_headers, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      done();
    });
  });

  it("restart dyno type", (done) => {
    expect(dyno_name).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos/web', alamo_headers, null, (err, data) => {
      if(err) {
        console.log('error restarting dyno type', dyno_name);
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.type).to.equal('web');
      expect(data.dyno).to.be.undefined;
      done();
    });
  });

  it("restart all dynos", (done) => {
    expect(dyno_name).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.type).to.be.undefined;
      expect(data.dyno).to.be.undefined;
      done();
    });
  });

  it("ensure we still have two dynos running.", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/dynos', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data.length).to.be.at.least(2);
      done();
    });
  });


  it("covers removing test app.", (done) => {
    // destroy the app.
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

});

