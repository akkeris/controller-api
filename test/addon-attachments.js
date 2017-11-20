"use strict"

  process.env.DEFAULT_PORT = "5000";
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const running_app = require('../index.js');
  const httph = require('../lib/http_helper.js');
  const builds = require('../lib/builds.js');
  const expect = require("chai").expect;
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};

function wait_for_app(httph, app, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 30) {
    process.stdout.write("\n");
    callback({code:0, message:"Timeout waiting for app to turn up."});
  }
  httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN, {'X-Timeout':500}, null, (err, data) => {
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

describe("addons attachments:", function() {
  this.timeout(100000);

  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000)
  it("covers creating the test app for services", (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}),
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers,
          JSON.stringify({size:"constellation", quantity:1, "type":"web", port:5000}),
          (err, data) => {
            expect(err).to.be.null;
            done();
        });
    });
  });

  let memcached_response = null;
  let memcached_plan = null;

  it("covers getting a memcached plans", (done) => {
    httph.request('get', 'http://localhost:5000/addon-services/alamo-memcached/plans', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      obj.forEach(function(plan) {
        if(plan.name === "alamo-memcached:small") {
          memcached_plan = plan;
        }
      });
      expect(memcached_plan).to.be.an('object');
      done();
    });
  });
  it("covers creating a memcached service", (done) => {
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":memcached_plan.id}),
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      memcached_response = obj;
      done();
    });
  });

  it("covers getting info on a running memcached service", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    });
  });

  it("covers getting stats on running memcached", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id + '/actions/stats', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      done();
    });
  });

  it("covers flushing cache on running memcached", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id + '/actions/flush', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  it("covers listing all services and checking for memcached", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let found_memcached = false;
        obj.forEach(function(service) {
          if(service.id === memcached_response.id) {
            found_memcached = true;
          }
        });
        expect(found_memcached).to.equal(true);
        done();
    });
  });

  it("covers listing all attached services, owned service should not be in attachments", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addon-attachments', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.length).to.equal(0);
        done();
    });
  });

  // test addon attachments
  let appname_second_new = "alamotest" + Math.floor(Math.random() * 10000);
  let appname_second_id = null;
  it("covers creating the second test app for services", (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_second_new}),
      (err, data) => {
        if(err) {
          console.error(err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        appname_second_id = data.id;
        httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/formation', alamo_headers,
          JSON.stringify({size:"constellation", quantity:1, "type":"web", port:5000}),
          (err, data) => {
            expect(err).to.be.null;
            done();
        });
    });
  });

  let memcached_addon_attachment_id = null;
  it("covers attaching memcachier to the second test app", (done) => {
    expect(appname_second_id).to.be.a("string");
    httph.request('post', 'http://localhost:5000/addon-attachments', alamo_headers,
      JSON.stringify({"addon":memcached_response.id, "app":appname_second_id, "force":true, "name":"memcachier"}),
      (err, data) => {
        if(err) {
          console.error(err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        memcached_addon_attachment_id = data.id;
        expect(data.id).to.be.a('string');
        expect(data.addon).to.be.an('object');
        expect(data.addon.app).to.be.an('object');
        expect(data.addon.plan).to.be.an('object');
        expect(data.app).to.be.an('object');
        done();
      });
  });
  it("covers listing addon attachments by apps", (done) => {
    expect(appname_second_id).to.be.a("string");
    httph.request('get', 'http://localhost:5000/apps/' + appname_second_new + '-default/addon-attachments', alamo_headers,
      null, (err, data) => {
        if(err) {
          console.error('listing addon', err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        expect(data.some((x) => { return x.id = memcached_addon_attachment_id; })).to.equal(true);
        done();
      });
  });

  it("covers ensuring attached memcachier is not listed as normal addon", (done) => {
    expect(appname_second_id).to.be.a("string");
    httph.request('get', 'http://localhost:5000/apps/' + appname_second_new + '-default/addons', alamo_headers,
      null, (err, data) => {
        if(err) {
          console.error('listing addon', err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        expect(data.length).to.equal(0);
        done();
      });
  });

  it("covers ensuring we cant attach memcachier to the same test app", (done) => {
    expect(appname_second_id).to.be.a("string");
    httph.request('post', 'http://localhost:5000/addon-attachments', alamo_headers,
      JSON.stringify({"addon":memcached_response.id, "app":appname_second_id, "force":true, "name":"memcachier"}),
      (err, data) => {
        expect(err).to.be.a('object');
        done();
      });
  });

  it("covers ensuring addons can be dettached", (done) => { 
    expect(memcached_addon_attachment_id).to.be.a("string");
    httph.request('delete', 'http://localhost:5000/apps/' + appname_second_new + '-default/addon-attachments/' + memcached_addon_attachment_id, alamo_headers,
      null,
      (err, data) => {
        if(err) {
          console.error(err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        expect(data.id).to.be.a('string');
        expect(data.addon).to.be.an('object');
        expect(data.addon.app).to.be.an('object');
        expect(data.addon.plan).to.be.an('object');
        expect(data.app).to.be.an('object');
        done();
      });
  });

  it("covers ensuring detaching does not remove service from owner", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    });
  });

  it("covers deleting the second test app", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + appname_second_new + '-default', alamo_headers, null, (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  it("covers ensuring deleting app with service does not unprovision, but detach service", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err);
        console.error(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    });
  });


  // TODO: We need to test what happens when we delete an app both as owner (should detach) and as secondary (should delete/detach)
  // this only tests explicit paths. We do not want to explicitly remove the service but implicity by deleting the app.
  //
  // it("covers removing memcached service", (done) => {
  //   expect(memcached_response).to.be.an('object');
  //   expect(memcached_plan).to.be.an('object');
  //   expect(memcached_plan.id).to.be.a('string');
  //   httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null,
  //   (err, data) => {
  //     if(err) {
  //       console.error(err);
  //       console.error(err.message);
  //     }
  //     expect(err).to.be.null;
  //     expect(data).to.be.a('string');
  //     let obj = JSON.parse(data);
  //     expect(obj).to.be.an('object');
  //     expect(obj.id).to.equal(memcached_response.id);
  //     done();
  //   });
  // });

  // it("covers ensuring all services were deleted", (done) => {
  //   httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null,
  //     (err, data) => {
  //       if(err) {
  //         console.error(err);
  //         console.error(err.message);
  //       }
  //       expect(err).to.be.null;
  //       expect(data).to.be.a('string');
  //       let obj = JSON.parse(data);
  //       expect(obj).to.be.an('array');
  //       expect(obj.length).to.equal(0);
  //       done();
  //   });
  // });

  it("covers deleting the test app for services", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
});