"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const init = require('./support/init.js');
const httph = require('../lib/http_helper.js')
const expect = require("chai").expect;
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"alamotest"};

function wait_for_app_content(httph, app, path, content, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 60) {
    process.stdout.write("\n");
    callback({code:0, message:"Timeout waiting for app to turn up."});
  }
  setTimeout(function() {
    httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN + '/' + path, {'X-Timeout':1500}, null, (err, data) => {
      if(err || data.indexOf(content) === -1) {
        process.stdout.write(".");
        setTimeout(wait_for_app_content.bind(null, httph, app, path, content, callback, (iteration + 1)), 250);
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

describe("addons attachments:", function() {
  this.timeout(100000);

  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000)
  it("covers creating the test app for services", (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}),
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let app_url = JSON.parse(data).web_url;
        expect(app_url).to.be.a('string');
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

  it("covers creating dependent build for first test app", (done) => {
    let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload), (err, info) => {
      expect(err).to.be.null;
      expect(info).to.be.a('string');
      let build_info = JSON.parse(info);
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
  })

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

  it("covers ensuring owned addon MEMCACHED_URL is returned from first app", (done) => {
    setTimeout(function() {
      wait_for_app_content(httph, appname_brand_new, 'MEMCACHED_URL', memcached_response.config_vars.MEMCACHED_URL, function(wait_app_err, resp) {
        if(wait_app_err) {
          console.log(wait_app_err);
        }
        expect(wait_app_err).to.be.null;
        expect(resp).to.equal(memcached_response.config_vars.MEMCACHED_URL);
        done();
      });
    }, 1000);
  });

  it("covers getting info on a running memcached service by name", (done) => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.name, alamo_headers, null,
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
        done();
    });
  });

  let audit_response = null;
  it("covers listing all audit events for attachments", (done) => {
    httph.request('get', 'http://localhost:5000/audits?app=' + appname_brand_new + '&space=default', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        console.log(obj)
        expect(obj).to.be.an('array');
        expect(obj[0]._source.action).to.eql("addon_change")
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


  it("covers creating dependent build for second test app", (done) => {
    let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
    httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/builds', alamo_headers, JSON.stringify(build_payload), (err, info) => {
      expect(err).to.be.null;
      expect(info).to.be.a('string');
      let build_info = JSON.parse(info);
      wait_for_build(httph, appname_second_new + '-default', build_info.id, (wait_err, building_info) => {
        if(wait_err) {
          console.error("Error waiting for build:", wait_err);
          return expect(true).to.equal(false);
        }
        httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/releases', alamo_headers, JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id}), (err, release_info) => {
          if(err) {
            console.log('release error:', err);
          }
          expect(err).to.be.null;
          expect(release_info).to.be.a('string');
          done();
        });
      });
    });
  })

  let memcached_addon_attachment_id = null;
  it("covers attaching memcachier to the second test app by name", (done) => {
    expect(appname_second_id).to.be.a("string");
    httph.request('post', 'http://localhost:5000/addon-attachments', alamo_headers,
      JSON.stringify({"addon":memcached_response.name, "app":appname_second_id, "force":true, "name":"memcachier"}),
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


  it("covers ensuring attached addon MEMCACHED_URL is returned from second app", (done) => {
    setTimeout(function() {
      wait_for_app_content(httph, appname_second_new, 'MEMCACHED_URL', memcached_response.config_vars.MEMCACHED_URL, function(wait_app_err, resp) {
        if(wait_app_err) {
          console.log(wait_app_err);
        }
        expect(wait_app_err).to.be.null;
        expect(resp).to.equal(memcached_response.config_vars.MEMCACHED_URL);
        done();
      });
    }, 1000);
  });

  it("covers ensuring addon attachment config vars are returned", (done) => {
    expect(appname_second_id).to.be.a("string");
    httph.request('get', 'http://localhost:5000/apps/' + appname_second_new + '-default/config-vars', alamo_headers,
      null, (err, data) => {
        if(err) {
          console.error('listing addon', err);
          console.error(err.message);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        expect(data.MEMCACHED_URL).to.equal(memcached_response.config_vars.MEMCACHED_URL);
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

  it("covers ensuring we cannot attach memcachier to the same test app", (done) => {
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