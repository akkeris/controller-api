"use strict"

  process.env.DEFAULT_PORT = "5000";
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const init = require('./support/init.js');
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};

  function validate_service(obj) {
    expect(obj.actions).to.be.an('array')
    expect(obj.cli_plugin_name).to.be.a('string')
    expect(obj.created_at).to.be.a('string')
    expect(obj.description).to.be.a('string')
    expect(obj.human_name).to.be.a('string')
    expect(obj.id).to.be.a('string')
    expect(obj.name).to.be.a('string')
    expect(obj.state).to.be.a('string')
    expect(obj.available_regions).to.be.an('array')
    expect(obj.supports_multiple_installations).to.be.a('boolean')
    expect(obj.supports_sharing).to.be.a('boolean')
    expect(obj.updated_at).to.be.a('string')
  }

  function validate_plan(obj) {
    expect(obj.addon_service).to.be.an('object')
    expect(obj.addon_service.id).to.be.a('string')
    expect(obj.addon_service.name).to.be.a('string')
    expect(obj.created_at).to.be.a('string')
    expect(obj.default).to.be.a('boolean')
    expect(obj.description).to.be.a('string')
    expect(obj.human_name).to.be.a('string')
    expect(obj.id).to.be.a('string')
    expect(obj.installable_inside_private_network).to.be.a('boolean')
    expect(obj.installable_outside_private_network).to.be.a('boolean')
    expect(obj.name).to.be.a('string')
    expect(obj.key).to.be.a('string')
    expect(obj.price).to.be.an('object')
    expect(obj.price.cents).to.be.a('number')
    expect(obj.price.unit).to.be.a('string')
    expect(obj.available_regions).to.be.an('array')
    expect(obj.available_regions[0]).to.be.a('string')
    expect(obj.compliance).to.be.an('array')
    expect(obj.space_default).to.be.a('boolean')
    expect(obj.state).to.be.a('string')
    expect(obj.updated_at).to.be.a('string')
  }

describe("vault: provisioning, etc", function() {
  this.timeout(100000);

  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000)
  it("covers creating the test app for services", (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}),
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
    });
  });

  let vault_plan = null;
  let vault_response = null;
  let vault_qa_plan = null;
  let vault_prod_plan = null;
  it("covers creating a formation for the app to attach services", (done) => {
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers,
      JSON.stringify({size:"constellation", quantity:1, "type":"web", port:5000}),
      (err, data) => {
        expect(err).to.be.null;
        done();
    });
  });

  it("covers getting vault service", (done) => {
    // we need to delay and wait for vault to come available.
    setTimeout(function() {
      httph.request('get', 'http://localhost:5000/addon-services/perf-db', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err)
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        validate_service(obj)
        done();
      });
    }, 20000);
  });

  it("covers getting vault plans", (done) => {
    // we need to delay and wait for vault to come available.
    httph.request('get', 'http://localhost:5000/addon-services/perf-db/plans', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      obj.forEach(function(plan) {
        if(plan.name === "perf-db:dev") {
          vault_plan = plan;
        } else if (plan.name === "perf-db:qa") {
          vault_qa_plan = plan;
        } else if (plan.name === "perf-db:prod") {
          vault_prod_plan = plan;
        }
      });
      expect(vault_plan).to.be.an('object');
      expect(vault_qa_plan).to.be.an('object');
      expect(vault_prod_plan).to.be.an('object');
      obj.forEach(validate_plan)
      done();
    });
  });

  it("covers creating a vault service", (done) => {
    expect(vault_plan).to.be.an('object');
    expect(vault_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":vault_plan.id}),
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      vault_response = obj;
      done();
    });
  });

  // we already have dev attached, try and attach qa vault plan.
  it("covers ensuring an addon marked as unable to be attached twice, wont be attached", (done) => {
    expect(vault_qa_plan).to.be.an('object');
    expect(vault_qa_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":vault_qa_plan.id}),
    (err, data) => {
      expect(err).to.be.not.null;
      expect(data).to.be.null;
      done();
    });
  });
  it("covers ensuring a vault service marked prod cannot be attached to a non-prod space", (done) => {
    expect(vault_prod_plan).to.be.an('object');
    expect(vault_prod_plan.id).to.be.a('string');
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, JSON.stringify({"plan":vault_prod_plan.id}),
    (err, data) => {
      expect(err).to.be.an('object');
      expect(err.message).to.equal('The specified addon may not be attached to this app.  It requires these necessary compliances in the space: prod');
      expect(data).to.be.null;
      done();
    });
  });

  it("covers getting info on a running vault service", (done) => {
    expect(vault_response).to.be.an('object');
    expect(vault_plan).to.be.an('object');
    expect(vault_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + vault_response.id, alamo_headers, null,
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(vault_response.id);
      done();
    });
  });
  it("covers checking config vars for vault", (done) => {
    expect(vault_response).to.be.an('object');
    expect(vault_plan).to.be.an('object');
    expect(vault_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, null,
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.OCT_VAULT_DB_PERF_HOSTNAME).to.be.a('string')
      done();
    });
  });
  it("covers listing all services and checking for vault", (done) => {
    expect(vault_response).to.be.an('object');
    expect(vault_plan).to.be.an('object');
    expect(vault_plan.id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let found_vault = false;
        obj.forEach(function(service) {
          if(service.id === vault_response.id) {
            found_vault = true;
          }
        });
        expect(found_vault).to.equal(true);
        done();
    });
  });
  it("covers removing vault service", (done) => {
    expect(vault_response).to.be.an('object');
    expect(vault_plan).to.be.an('object');
    expect(vault_plan.id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons' + '/' + vault_response.id, alamo_headers, null,
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(vault_response.id);
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