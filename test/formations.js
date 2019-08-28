"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const exec = require('child_process').spawn;
const init = require('./support/init.js')
const httph = require('../lib/http_helper.js');
const expect = require("chai").expect;
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};

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
    httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN, {'X-Timeout':1500}, null, function(err, data) {
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
  httph.request('get', 'http://localhost:5000/apps/' + app + '/builds/' + build_id, alamo_headers, null, function(err, data) {
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

describe("formations: creating, updating and deleting dynos and process types", function() {
  this.timeout(30000);
  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000)
  // set return value
  let RETURN_VALUE = "foo" + Math.floor(Math.random() * 100000);
  let set_config_succeeded = true;
  // from test/support/worker-app, zip -r ~/.workerapp.zip * (while in that directory), base64 ~/.workerapp.zip
  let web_type_functioning = false;
  let release_succeeded = false;

  it("covers creating test app for formations", function(done) {
    // create an app.
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}),
    function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
  it("Ensures processes cannot create invalid ports.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"web", port:-2}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The specified port is invalid, it must be a number between 1024 and 65535.');
        httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
          JSON.stringify({size:"gp2", quantity:1, "type":"web", port:0.5}),
          function(err, data) {
            expect(err).to.be.an('object');
            expect(data).to.be.null;
            expect(err.code).to.equal(422);
            expect(err.message).to.equal('The specified port is invalid, it must be a number between 1024 and 65535.');
            done();
        });
      });
  });
  it("Ensures getting dyno size info.", function(done) {
    httph.request('get', 'http://localhost:5000/sizes', {"Authorization":process.env.AUTH_KEY}, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let appsobj = JSON.parse(data);
      expect(appsobj).to.be.an('array');
      appsobj.forEach(function(appobj) {
        if(appobj.name === 'gp2') {
          expect(appobj).to.be.an('object');
          expect(appobj.resources).to.be.an('object');
          expect(appobj.resources.requests).to.be.an('object');
          expect(appobj.resources.requests.memory).to.be.a('string');
          expect(appobj.resources.limits).to.be.an('object');
          expect(appobj.resources.limits.memory).to.be.an('string');
          done();
        }
      });
    });
  });

  it("Ensures processes cannot create invalid quantities.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:-1, "type":"web", port:9000}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The number of instances must be between 0 and 32.');
        httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
          JSON.stringify({size:"gp2", quantity:1000, "type":"web", port:9000}),
          function(err, data) {
            expect(err).to.be.an('object');
            expect(data).to.be.null;
            expect(err.code).to.equal(422);
            expect(err.message).to.equal('The number of instances must be between 0 and 32.');
            done();
        });
      });
  });
  it("Ensures processes cannot create invalid quantities.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"foobar", quantity:1, "type":"web", port:9000}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The payload size was not recognized.');
        done();
      });
  });
  it("Ensures processes cannot create invalid types.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"what da heck.", port:9000}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The type specified was invalid, it cannot contain spaces or special characters (lower case alpha numeric only)');
        done();
      });
  });
  it("Ensures creation of web type.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"web", port:9000}),
      function(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let formation_info = JSON.parse(data);
        expect(formation_info.app).to.be.an('object');
        expect(formation_info.app.id).to.be.a('string');
        expect(formation_info.command).to.be.null;
        expect(formation_info.created_at).to.be.a('string');
        expect(formation_info.updated_at).to.be.a('string');
        expect(formation_info.id).to.be.a('string');
        expect(formation_info.quantity).to.equal(1);
        expect(formation_info.port).to.equal(9000);
        expect(formation_info.size).to.equal('gp2');
        expect(formation_info.type).to.equal('web');
        expect(formation_info.app.name).to.equal(appname_brand_new + '-default');
        done();
      });
  });
  it("Ensures one cannot create duplicate types.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"web", port:9000}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The process of type web already exists.');
        done();
      });
  });
  it("Ensures a port on a worker type throws an error.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"worker", port:9000, "command":"node worker.js"}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('A port was specified for a non-web based application, the port should not be set.');
        done();
      });
  });
  it("Ensures a healthcheck on a worker type throws an error.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"worker", "command":"node worker.js", "healthcheck":"/"}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('A healthcheck was specified for a non-web based application, the path should not be set.');
        done();
      });
  });
  it("Ensures trying to remove healthcheck on a worker type throws an error.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", quantity:1, "type":"worker", "command":"node worker.js", removeHealthcheck:true}),
      function(err, data) {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('Cannot remove healthcheck on non web based dyno.');
        done();
      });
  });
  it("Ensures creation of a worker type.", function(done) {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', {"Authorization":process.env.AUTH_KEY},
      JSON.stringify({size:"gp2", "quantity":1, "type":"worker", "command":"node worker.js"}),
      function(err, data) {
        if(err) {
          console.error('Err:', err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let formation_info = JSON.parse(data);
        expect(formation_info.app).to.be.an('object');
        expect(formation_info.app.id).to.be.a('string');
        expect(formation_info.command).to.equal('node worker.js');
        expect(formation_info.created_at).to.be.a('string');
        expect(formation_info.updated_at).to.be.a('string');
        expect(formation_info.id).to.be.a('string');
        expect(formation_info.quantity).to.equal(1);
        expect(formation_info.port).to.be.null;
        expect(formation_info.size).to.equal('gp2');
        expect(formation_info.type).to.equal('worker');
        expect(formation_info.app.name).to.equal(appname_brand_new + '-default');
        done();
      });
  });
  it("covers adding config vars to worker", function(done) {
    // add a config var
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({"RETURN_VALUE":RETURN_VALUE}), function(err, data) {
      expect(err).to.be.null;
      done();
    });
  });

  it("Deploy code to app (and worker)", function(done) {
    this.timeout(0);
    expect(set_config_succeeded).to.equal(true);
    let build_payload = {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:33ed76bd038e8a5cdd39118c31a6ea1e6eb168911ac26daaaa91d6f998818e69","url":"docker://docker.io/akkeris/test-formations:latest"};
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload), function(err, build_info) {
      expect(err).to.be.null;
      let build_obj = JSON.parse(build_info);
      expect(build_obj.id).to.be.a('string');
      wait_for_build(httph, appname_brand_new + '-default', build_obj.id, function(wait_err, building_info) {
        if(wait_err) {
          console.error("Error waiting for build:", wait_err);
          return expect(true).to.equal(false);
        }
        release_succeeded = true;
        done();
      });
    });
  });

  it("Covers ensuring web type is functioning", function(done) {
    this.timeout(0);
    expect(release_succeeded).to.equal(true)
    setTimeout(function() {
      wait_for_app_content(httph, appname_brand_new, 'web process on 9000 with ' + RETURN_VALUE, function(wait_app_err, resp) {
        expect(wait_app_err).to.be.null;
        expect(resp).to.equal('web process on 9000 with ' + RETURN_VALUE);
        web_type_functioning = true;
        done();
      });
    },1000);
  });
  it("Covers ensuring batch update works", function(done) {
    let bu_payload = [{"port":8282, "quantity":2, "type":"web", "size":"gp1", "healthcheck":"/"}];
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers, JSON.stringify(bu_payload), function(err, data) {
      if(err) {
        console.log('error with batch update:', err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      // TODO:
      // - try changing command
      // - confirm changes for port
      // - confirm changes for quantity.
      done();
    });
  });
  it("Covers removing healthcheck works", function(done) {
    let bu_payload = [{"type":"web", removeHealthcheck:true}];
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers, JSON.stringify(bu_payload), function(err, data) {
      if(err) {
        console.log('error with batch update:', err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      // TODO:
      // - try changing command
      // - confirm changes for port
      // - confirm changes for quantity.
      done();
    });
  });

  it("Covers getting info on a formation", function(done) {
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation/worker', alamo_headers, null, function(err, data) {
      if(err) {
        console.log('error with delete:', err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  it("covers audit events for formations", (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app='+ appname_brand_new + '&space=default', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.some((x)=> x.action === 'formation_change')).to.eql(true);
        done();
    });
    }, 5000);
  });

  it("Covers deleting a worker", function(done) {
    // avoid queuing issues by waiting briefly.
    setTimeout(function() {
      httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation/worker', alamo_headers, null, function(err, data) {
        if(err) {
          console.log('error with delete:', err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
      });
    }, 500)
  });
  it("Covers listing formations, confirming deletion", function(done) {
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers, null, function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.length).to.equal(1);
      expect(data[0].type).to.equal('web');
      done();
    });
  });
  after(function(done){
    // destroy the app.
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
});