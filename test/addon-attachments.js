"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const support = require('./support/init.js');
const httph = require('../lib/http_helper.js')
const expect = require("chai").expect;
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};

describe("addons attachments:", function() {
  this.timeout(100000);

  let appname_brand_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  let memcached_response = null;
  let memcached_plan = null;
  let audit_response = null;
  let appname_second_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  let appname_second_id = null;
  let memcached_addon_attachment_id = null;

  it("covers creating the test app for services", async (done) => {
    try {
      let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"default", name:appname_brand_new}));
      expect(data).to.be.a('string');
      let app_url = JSON.parse(data).web_url;
      expect(app_url).to.be.a('string');
      await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers, JSON.stringify({size:"constellation", quantity:1, "type":"web", port:5000}))
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers getting a memcached plans", async (done) => {
    try {
      let data = await httph.request('get', 'http://localhost:5000/addon-services/alamo-memcached/plans', alamo_headers, null);
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
    } catch (e) {
      done(e);
    }
  });

  it("covers creating a memcached service", async (done) => {
    try {
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('post', `http://localhost:5000/apps/${appname_brand_new}-default/addons`, alamo_headers, JSON.stringify({"plan":memcached_plan.id}));
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      memcached_response = obj;
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers creating dependent build for first test app", async (done) => {
    try {
      let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
      let info = await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload));
      expect(info).to.be.a('string');
      let build_info = JSON.parse(info);
      await support.wait_for_build(`${appname_brand_new}-default`, build_info.id);
      let payload = JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id});
      let release_info = await httph.request('post', `http://localhost:5000/apps/${appname_brand_new}-default/releases`, alamo_headers, payload);
      expect(release_info).to.be.a('string');
      done();
    } catch (e) {
      done(e);
    }
  })

  it("covers getting info on a running memcached service", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null);
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    } catch (e) {
      done(e)
    }
  });

  it("covers ensuring owned addon MEMCACHED_URL is returned from first app", async (done) => {
    try {
      await support.wait(1000);
      await support.wait_for_app_content(`https://${appname_brand_new}${process.env.ALAMO_BASE_DOMAIN}/MEMCACHED_URL`, memcached_response.config_vars.MEMCACHED_URL);
      done();
    } catch (e) {
      done(e)
    }
  });

  it("covers getting info on a running memcached service by name", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.name, alamo_headers, null);
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers getting stats on running memcached", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id + '/actions/stats', alamo_headers, null);
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers flushing cache on running memcached", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id + '/actions/flush', alamo_headers, null);
      expect(data).to.be.a('string');
      done();
    } catch (e) { 
      done(e);
    }
  });

  it("covers listing all services and checking for memcached", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons', alamo_headers, null);
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
    } catch (e) {
      done(e);
    }
  });

  it("covers listing all attached services, owned service should not be in attachments", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addon-attachments', alamo_headers, null);
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      expect(obj.length).to.equal(0);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers listing all audit events for attachments", async (done) => {
    try {
      let data = await httph.request('get', 'http://localhost:5000/audits?app=' + appname_brand_new + '&space=default', alamo_headers, null); 
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      expect(obj.some((x)=> x.action === 'addon_change')).to.eql(true);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers creating the second test app for services", async (done) => {
    try {
      let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"default", name:appname_second_new}));  
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      appname_second_id = data.id;
      await httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/formation', alamo_headers, JSON.stringify({size:"constellation", quantity:1, "type":"web", port:5000}));
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers creating dependent build for second test app", async (done) => {
    try {
      let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
      let info = await httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/builds', alamo_headers, JSON.stringify(build_payload));
      expect(info).to.be.a('string');
      let build_info = JSON.parse(info);
      let building_info = await support.wait_for_build(`${appname_second_new}-default`, build_info.id);
      let release_info = await httph.request('post', `http://localhost:5000/apps/${appname_second_new}-default/releases`, alamo_headers, JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id}));
      expect(release_info).to.be.a('string');
      done();
    } catch (e) {
      done(e);
    }
  })

  it("covers attaching memcachier to the second test app by name", async (done) => {
    try {
      expect(appname_second_id).to.be.a("string");
      let data = await httph.request('post', 'http://localhost:5000/addon-attachments', alamo_headers, JSON.stringify({"addon":memcached_response.name, "app":appname_second_id, "force":true, "name":"memcachier"}));
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      memcached_addon_attachment_id = data.id;
      expect(data.id).to.be.a('string');
      expect(data.addon).to.be.an('object');
      expect(data.addon.app).to.be.an('object');
      expect(data.addon.plan).to.be.an('object');
      expect(data.app).to.be.an('object');
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers ensuring attached addon MEMCACHED_URL is returned from second app", async (done) => {
    try {
      await support.wait(1000);
      let resp = await support.wait_for_app_content(`https://${appname_second_new}${process.env.ALAMO_BASE_DOMAIN}/MEMCACHED_URL`, memcached_response.config_vars.MEMCACHED_URL);
      expect(resp).to.equal(memcached_response.config_vars.MEMCACHED_URL);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers ensuring the original memcacher on the root app cannot be removed since its attached", async (done) => {
    try {
      await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default/addons/${memcached_response.name}`, Object.assign({"x-silent-error":"true"}, alamo_headers), null);
      done(new Error('The memcached should not have been allowed to be removed'))
    } catch (e) {
      expect(e.code).to.equal(409)
      expect(e.message).to.equal('This addon cannot be removed as its attached to other apps.')
      done();
    }
  });

  it("covers ensuring the original app cannot be deleted since an addon is attached to another app", async (done) => {
    try { 
      let data = await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default`, Object.assign({"x-silent-error":"true"},alamo_headers), null);
      expect(data).to.be.a('string');
      done(new Error('this should not have happened.'));
    } catch (e) {
      expect(e.code).to.equal(409);
      expect(e.message).to.equal('This app cannot be removed as it has addons that are attached to another app.');
      done();
    }
  });

  it("covers ensuring addon attachment config vars are returned", async (done) => {
    try {
      expect(appname_second_id).to.be.a("string");
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_second_new + '-default/config-vars', alamo_headers, null);
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.MEMCACHED_URL).to.equal(memcached_response.config_vars.MEMCACHED_URL);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers listing addon attachments by apps", async (done) => {
    try {
      expect(appname_second_id).to.be.a("string");
      let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/addon-attachments`, alamo_headers, null);
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.some((x) => { return x.id = memcached_addon_attachment_id; })).to.equal(true);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers ensuring attached memcachier is not listed as normal addon", async (done) => {
    try {
      expect(appname_second_id).to.be.a("string");
      let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/addons`, alamo_headers, null)
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.length).to.equal(0);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers ensuring we cannot attach memcachier to the same test app", async (done) => {
    try {
      expect(appname_second_id).to.be.a("string");
      await httph.request('post', 'http://localhost:5000/addon-attachments', Object.assign({'x-silent-error':'true'}, alamo_headers), JSON.stringify({"addon":memcached_response.id, "app":appname_second_id, "force":true, "name":"memcachier"}))
      done(new Error ('should not happen'));
    } catch (e) {
      done();
    }
  });

  it("covers ensuring addons can be dettached", async (done) => { 
    try {
      expect(memcached_addon_attachment_id).to.be.a("string");
      let data = await httph.request('delete', `http://localhost:5000/apps/${appname_second_new}-default/addon-attachments/${memcached_addon_attachment_id}`, alamo_headers, null);
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.id).to.be.a('string');
      expect(data.addon).to.be.an('object');
      expect(data.addon.app).to.be.an('object');
      expect(data.addon.plan).to.be.an('object');
      expect(data.app).to.be.an('object');
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers ensuring detaching does not remove service from owner", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null);
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers deleting the second test app", async (done) => {
    try {
      let data = await httph.request('delete', `http://localhost:5000/apps/${appname_second_new}-default`, alamo_headers, null);
      expect(data).to.be.a('string');
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers ensuring deleting app with service does not unprovision, but detach service", async (done) => {
    try {
      expect(memcached_response).to.be.an('object');
      expect(memcached_plan).to.be.an('object');
      expect(memcached_plan.id).to.be.a('string');
      let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null);
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.equal(memcached_response.id);
      done();
    } catch (e) {
      done(e);
    }
  });

  it("covers deleting the test app for services", async (done) => {
    try { 
      let data = await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default`, alamo_headers, null);
      expect(data).to.be.a('string');
      done();
    } catch (e) {
      done(e);
    }
  });
});
