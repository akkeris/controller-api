"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const init = require('./support/init.js');
const httph = require('../lib/http_helper.js');
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

describe("addons: provisioning postgres and redis services.", function() {  
  this.timeout(100000);

  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000)
  console.log("appname_brand_new="+appname_brand_new)

  it("covers creating the test app for services", (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}), 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
    });
  });


  let postgres_plan = null;
  let postgresonprem_plan = null;
  let redis_plan = null;
  let postgres_response = null;
  let postgresonprem_response = null;
  let redis_response = null;

  it("covers getting a postgres plans", (done) => {
    httph.request('get', 'http://localhost:5000/addon-services/alamo-postgresql/plans', alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      obj.forEach(function(plan) {
        if(plan.name === "alamo-postgresql:hobby") {
          postgres_plan = plan;
        }
      });
      expect(postgres_plan).to.be.an('object');
      done();
    });
  });

  it("covers getting a postgres onprem plans", (done) => {
    httph.request('get', 'http://localhost:5000/addon-services/alamo-postgresqlonprem/plans', alamo_headers, null,
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      obj.forEach(function(plan) {
        if(plan.name === "alamo-postgresqlonprem:shared") {
          postgresonprem_plan = plan;
        }
      });
      expect(postgresonprem_plan).to.be.an('object');
      done();
    });
  });

  it("covers getting a redis plans", (done) => {
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/addon-services/alamo-redis/plans', alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      obj.forEach(function(plan) {
        if(plan.name === "alamo-redis:small") {
          redis_plan = plan;
        }
      });
      expect(redis_plan).to.be.an('object');
      done();
    });
  });

  it("covers creating a postgres instance and being able to add an addon to an app without a formation running", (done) => {
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    expect(redis_plan).to.be.an('object');
    expect(redis_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":postgres_plan.id}), 
    (err, data) => {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      postgres_response = obj;
      done();
    });
  });

  it("covers creating a redis service and being able to add an addon to an app with an existing formation", (done) => {
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    expect(redis_plan).to.be.an('object');
    expect(redis_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":redis_plan.id}), 
    (err, data) => {
      if(err) {
        console.log(err);
        console.log(err.message);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      redis_response = obj;
      done();
    });
  });

  it("covers getting info on a running postgres service", (done) => {
    expect(postgres_response).to.be.an('object');
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + postgres_response.id, alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(postgres_response.id);
      done();
    });
  });
  it("covers getting info on a running redis service", (done) => {
    expect(redis_response).to.be.an('object');
    expect(redis_plan).to.be.an('object');
    expect(redis_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + redis_response.id, alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(redis_response.id);
      done();
    });
  });
  it("covers listing all services and checking for postgres", (done) => {
    expect(postgres_response).to.be.an('object');
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let found_postgres = false;
        obj.forEach(function(service) {
          if(service.id === postgres_response.id) {
            found_postgres = true;
          }
        });
        expect(found_postgres).to.equal(true);
        done();
    });
  });
  it("covers listing all services and checking for redis", (done) => {
    expect(redis_response).to.be.an('object');
    expect(redis_plan).to.be.an('object');
    expect(redis_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let found_redis = false;
        obj.forEach(function(service) {
          if(service.id === redis_response.id) {
            found_redis = true;
          }
        });
        expect(found_redis).to.equal(true);
        done();
    });
  });

/*
  // TODO: Check to make sure we can connect to redis and postgres.
  // TODO: Check to make sure the environment variables are in the app (DATABASE_URL, REDIS_URL)
  it("covers creating a build to check redis and postgres services", (done) => {
    let build_payload = {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:e693f75d7921e6c1b97d1060f1639bdf59475935b45b88e7257e7a4700906cb2","url":"data:base64,UEsDBBQAAAAIAApHD0ki9l2EawAAAIUAAAAKABwARG9ja2VyZmlsZVVUCQADFNixV+rksVd1eAsAAQSKPdBdBEafakZzC/L3VcjLT0m1SixKz8/jCgr1U8jNTsksUtAtUNAvLS7SLy5K1k8sKOAK9w/ydvEMQhV09g+IVNBDFQMZkVeQq5CZV1ySmJPD5RoR4B/sqmBqYGDA5ezrohCtoASUVtJRUALKF5UoKcQCAFBLAwQUAAAACAA8Rw9J6MmClxwBAADRAQAACAAcAGJ1aWxkLnNoVVQJAANz2LFXvuWxV3V4CwABBIo90F0ERp9qRmWQUUvDMBSF3/MrrnEwkLW1c+tDYYKI4NN82B4LNk1jE7Ym5Sbd0Ln/bppOkPmQh3znnJx7c3uTVEonFbOSYAsRfkAcJ9b0yIWNv1RH/PH4isIdIZvXp/kyW5VWMtv7KAN/hai6tn4DO+5geoIOlXYwSeE8Lcnz23r7st5uVqXvFtniKlUSwaWByVgyXuipoL6soHlB0/nDYpkVdFZQg01AhjOntcAAUXQmUOlcZ/MkaZSTfRVz0yaGOzYYfV8rotHpIxUyzWUItcy6y0MHgVYZHfAhje8D5FLwnV86UD+SHzG/jBr0HvdBqplj+bjfbPK7cXDUhu8EvqNolHX4Gdx/hb1plP5HO2bt0WB9Ec4U4HH4uNi1XTSUEfIDUEsDBBQAAAAIABRHD0kNgwINmwAAAMIAAAAIABwAaW5kZXguanNVVAkAAyjYsVe55bFXdXgLAAEEij3QXQRGn2pGRY7BCsIwEETP9itySwI1BsGLUs/iQQ/9gpCuGimbuFkrpfTfTQ/ibWZ4M4yPmFk8mJNoBMHrHQiUXLzUh6pahPEEjqEFGoCUKlBdyKxFcxRTtSrSfCgwnMB1amttLSbpIzIgr3lMIPfSpdQH7zhE3DxzRDmX8X9TndvrxWSmgPdwG1Wi6CFnAzjoHwjYqeXRrE0fchlXO2ttSb5QSwMEFAAAAAgA0E4PSWYdviqcAAAA7wAAAAwAHABwYWNrYWdlLmpzb25VVAkAA7jlsVe55bFXdXgLAAEEij3QXQRGn2pGVY+9DoMwDIR3nsLywFQQrKxVh85dWaLEFUYlQU6KkBDv3vxUqjrefWfd+agA0KqFcAAkuzWBfGhWcTNeEtpIPDubaN92bVdcQ14Lr+FLirkozoqtob2dfXFL0EdwRJmMoCSknHWG4C8caarPU/TkYMSbiJMBrIMEwK+k+clkRoS6Bto5QI/x8sxd6h0mJ79FL9ZkfX7t/rhidVYfUEsBAh4DFAAAAAgACkcPSSL2XYRrAAAAhQAAAAoAGAAAAAAAAQAAAKSBAAAAAERvY2tlcmZpbGVVVAUAAxTYsVd1eAsAAQSKPdBdBEafakZQSwECHgMUAAAACAA8Rw9J6MmClxwBAADRAQAACAAYAAAAAAABAAAA7YGvAAAAYnVpbGQuc2hVVAUAA3PYsVd1eAsAAQSKPdBdBEafakZQSwECHgMUAAAACAAURw9JDYMCDZsAAADCAAAACAAYAAAAAAABAAAApIENAgAAaW5kZXguanNVVAUAAyjYsVd1eAsAAQSKPdBdBEafakZQSwECHgMUAAAACADQTg9JZh2+KpwAAADvAAAADAAYAAAAAAABAAAApIHqAgAAcGFja2FnZS5qc29uVVQFAAO45bFXdXgLAAEEij3QXQRGn2pGUEsFBgAAAAAEAAQAPgEAAMwDAAAAAA==","docker_registry":"","docker_login":"","docker_password":""}
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload), (err, build_info) => {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(build_info).to.be.a('string');
      let build_obj = JSON.parse(build_info);
      expect(build_obj.id).to.be.a('string');
      setTimeout(function() {
        wait_for_build(httph, appname_brand_new + '-default', build_obj.id, (wait_err, building_info) => {
          if(wait_err) {
            console.error("Error waiting for build:", wait_err);
            return expect(true).to.equal(false);
          }
          httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/releases', alamo_headers, JSON.stringify({"slug":build_obj.id,"description":"Deploy " + build_obj.id}), (release_err, release_info) => {
            setTimeout(function() { 
              wait_for_app(httph, appname_brand_new, (wait_app_err, resp) => {
                  httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN, {'X-Timeout':500}, null, (err, data) => {
                    console.log("ENV are:", data);
                    done();
                  });
              });
            }, 500);
          });
        });
      }, 500);
    });
  })
*/

  it("covers removing a postgres service", (done) => {
    expect(postgres_response).to.be.an('object');
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + postgres_response.id, alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(postgres_response.id);
      done();
    });
  });
  it("covers removing a redis service", (done) => {
    expect(redis_response).to.be.an('object');
    expect(redis_plan).to.be.an('object');
    expect(redis_plan.id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + redis_response.id, alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(redis_response.id);
      done();
    });
  });
  it("covers ensuring all services were deleted", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.length).to.equal(0);
        done();
    });
  });
  it("covers creating a postgres onprem instance", (done) => {
    expect(postgresonprem_plan).to.be.an('object');
    expect(postgresonprem_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":postgresonprem_plan.id}),
    (err, data) => {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      postgresonprem_response = obj;
      done();
    });
  });

  it("covers listing all services and checking for postgres onprem", (done) => {
    expect(postgresonprem_response).to.be.an('object');
    expect(postgresonprem_plan).to.be.an('object');
    expect(postgresonprem_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let found_postgres = false;
        obj.forEach(function(service) {
          if(service.id === postgresonprem_response.id) {
            found_postgres = true;
          }
        });
        expect(found_postgres).to.equal(true);
        done();
    });
  });


  it("covers removing a postgres onprem service", (done) => {
    expect(postgresonprem_response).to.be.an('object');
    expect(postgresonprem_plan).to.be.an('object');
    expect(postgresonprem_plan.id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + postgresonprem_response.id, alamo_headers, null,
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(postgresonprem_response.id);
      done();
    });
  });



  it("covers ensuring all services were deleted", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.length).to.equal(0);
        done();
    });
  });



  it("covers deleting the test app for services", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
});
