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

  let appname_third_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  let appname_third_id = null;

  it("covers creating the test app for services", async () => {
    let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"default", name:appname_brand_new}));
    expect(data).to.be.a('string');
    let app_url = JSON.parse(data).web_url;
    expect(app_url).to.be.a('string');
    await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/formation', alamo_headers, JSON.stringify({size:"gp2", quantity:1, "type":"web", port:5000}))
  });

  it("covers getting a memcached plans", async () => {
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
  });

  it("covers creating a memcached service", async () => {
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('post', `http://localhost:5000/apps/${appname_brand_new}-default/addons`, alamo_headers, JSON.stringify({"plan":memcached_plan.id}));
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    memcached_response = obj;
  });

  it("covers creating dependent build for first test app", async () => {
    let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
    let info = await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/builds', alamo_headers, JSON.stringify(build_payload));
    expect(info).to.be.a('string');
    let build_info = JSON.parse(info);
    await support.wait_for_build(`${appname_brand_new}-default`, build_info.id);
    let payload = JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id});
    let release_info = await httph.request('post', `http://localhost:5000/apps/${appname_brand_new}-default/releases`, alamo_headers, payload);
    expect(release_info).to.be.a('string');
  })

  it("covers getting info on a running memcached service", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null);
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(memcached_response.id);
  });

  it("covers ensuring owned addon MEMCACHED_URL is returned from first app", async () => {
    await support.wait(1000);
    await support.wait_for_app_content(`https://${appname_brand_new}${process.env.ALAMO_BASE_DOMAIN}/MEMCACHED_URL`, memcached_response.config_vars.MEMCACHED_URL);
  });

  it("covers getting info on a running memcached service by name", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.name, alamo_headers, null);
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(memcached_response.id);
  });

  it("covers getting stats on running memcached", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id + '/actions/stats', alamo_headers, null);
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('array');
  });

  it("covers flushing cache on running memcached", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id + '/actions/flush', alamo_headers, null);
    expect(data).to.be.a('string');
  });

  it("covers listing all services and checking for memcached", async () => {
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
  });

  it("covers listing all attached services, owned service should not be in attachments", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addon-attachments', alamo_headers, null);
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    expect(obj.length).to.equal(0);
  });

  it("covers listing all audit events for attachments", async () => {
    let data = await httph.request('get', 'http://localhost:5000/audits?app=' + appname_brand_new + '&space=default', alamo_headers, null); 
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    expect(obj.some((x)=> x.action === 'addon_change')).to.eql(true);
  });

  it("covers creating the second test app for services", async () => {
    let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"default", name:appname_second_new}));  
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    appname_second_id = data.id;
    await httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/formation', alamo_headers, JSON.stringify({size:"gp2", quantity:1, "type":"web", port:5000}));
  });

  it("covers creating dependent build for second test app", async () => {
    let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
    let info = await httph.request('post', 'http://localhost:5000/apps/' + appname_second_new + '-default/builds', alamo_headers, JSON.stringify(build_payload));
    expect(info).to.be.a('string');
    let build_info = JSON.parse(info);
    let building_info = await support.wait_for_build(`${appname_second_new}-default`, build_info.id);
    let release_info = await httph.request('post', `http://localhost:5000/apps/${appname_second_new}-default/releases`, alamo_headers, JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id}));
    expect(release_info).to.be.a('string');
  })

  it("covers attaching memcachier to the second test app by id, ensures prod=prod apps can attach", async () => {
    expect(appname_second_id).to.be.a("string");
    let data = await httph.request('post', 'http://localhost:5000/addon-attachments', alamo_headers, JSON.stringify({"addon":memcached_response.id, "app":appname_second_id, "force":true, "name":"memcachier"}));
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    memcached_addon_attachment_id = data.id;
    expect(data.id).to.be.a('string');
    expect(data.addon).to.be.an('object');
    expect(data.addon.app).to.be.an('object');
    expect(data.addon.plan).to.be.an('object');
    expect(data.app).to.be.an('object');
  });


  it("covers creating the third test app for services", async () => {
    let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"preview", name:appname_third_new}));  
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    appname_third_id = data.id;
    await httph.request('post', 'http://localhost:5000/apps/' + appname_third_new + '-preview/formation', alamo_headers, JSON.stringify({size:"gp2", quantity:1, "type":"web", port:5000}));
  });

  it("covers attaching memcachier to the third test app by id, ensures prod!=non-prod apps can attach", async () => {
    try {
      expect(appname_second_id).to.be.a("string");
      let data = await httph.request('post', 'http://localhost:5000/addon-attachments', Object.assign({"x-silent-error":"true"}, alamo_headers), JSON.stringify({"addon":memcached_response.id, "app":appname_third_id, "name":"memcachier"}));
      throw new Error('this should not have worked.');
    } catch (e) {
      expect(e.code).to.equal(409)
      expect(e.message).to.equal('Addons from a socs controlled space cannot be attached to a non-socs controlled space.')
    }
  });

  it("covers creating dependent build for third app", async () => {
    let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-attach:v3"};
    let info = await httph.request('post', 'http://localhost:5000/apps/' + appname_third_new + '-preview/builds', alamo_headers, JSON.stringify(build_payload));
    expect(info).to.be.a('string');
    let build_info = JSON.parse(info);
    let building_info = await support.wait_for_build(`${appname_third_new}-preview`, build_info.id);
    let release_info = await httph.request('post', `http://localhost:5000/apps/${appname_third_new}-preview/releases`, alamo_headers, JSON.stringify({"slug":build_info.id,"description":"Deploy " + build_info.id}));
    expect(release_info).to.be.a('string');
  })


  it("covers ensuring attached addon MEMCACHED_URL is returned from second app", async () => {
    await support.wait(1000);
    let resp = await support.wait_for_app_content(`https://${appname_second_new}${process.env.ALAMO_BASE_DOMAIN}/MEMCACHED_URL`, memcached_response.config_vars.MEMCACHED_URL);
    expect(resp).to.equal(memcached_response.config_vars.MEMCACHED_URL);
  });

  it("covers ensuring the original memcacher on the root app cannot be removed since its attached", async () => {
    try {
      await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default/addons/${memcached_response.name}`, Object.assign({"x-silent-error":"true"}, alamo_headers), null);
      throw new Error('The memcached should not have been allowed to be removed')
    } catch (e) {
      expect(e.code).to.equal(409)
      expect(e.message).to.equal('This addon cannot be removed as its attached to other apps.')
    }
  });

  it("covers ensuring the original app cannot be deleted since an addon is attached to another app", async () => {
    try { 
      let data = await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default`, Object.assign({"x-silent-error":"true"},alamo_headers), null);
      expect(data).to.be.a('string');
      throw new Error('this should not have happened.');
    } catch (e) {
      expect(e.code).to.equal(409);
      expect(e.message).to.equal('This app cannot be removed as it has addons that are attached to another app.');
    }
  });

  it("covers ensuring addon attachment config vars are returned", async () => {
    expect(appname_second_id).to.be.a("string");
    let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_second_new + '-default/config-vars', alamo_headers, null);
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.MEMCACHED_URL).to.equal(memcached_response.config_vars.MEMCACHED_URL);
  });

  it("covers listing addon attachments by apps", async () => {
    expect(appname_second_id).to.be.a("string");
    let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/addon-attachments`, alamo_headers, null);
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.some((x) => { return x.id = memcached_addon_attachment_id; })).to.equal(true);
  });

  it("covers ensuring attached memcachier is not listed as normal addon", async () => {
    expect(appname_second_id).to.be.a("string");
    let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/addons`, alamo_headers, null)
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.length).to.equal(0);
  });

  it("covers ensuring we cannot attach memcachier to the same test app", async () => {
    try {
      expect(appname_second_id).to.be.a("string");
      await httph.request('post', 'http://localhost:5000/addon-attachments', Object.assign({'x-silent-error':'true'}, alamo_headers), JSON.stringify({"addon":memcached_response.id, "app":appname_second_id, "force":true, "name":"memcachier"}))
      expect(false).to.be.true;
    } catch (e) {
    }
  });

  it("covers ensuring addons can be dettached", async () => {
    expect(memcached_addon_attachment_id).to.be.a("string");
    let data = await httph.request('delete', `http://localhost:5000/apps/${appname_second_new}-default/addon-attachments/${memcached_addon_attachment_id}`, alamo_headers, null);
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.id).to.be.a('string');
    expect(data.addon).to.be.an('object');
    expect(data.addon.app).to.be.an('object');
    expect(data.addon.plan).to.be.an('object');
    expect(data.app).to.be.an('object');
  });

  it("covers ensuring detaching does not remove service from owner", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null);
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(memcached_response.id);
  });

  it("covers deleting the second test app", async () => {
    let data = await httph.request('delete', `http://localhost:5000/apps/${appname_second_new}-default`, alamo_headers, null);
    expect(data).to.be.a('string');
  });

  it("covers ensuring deleting app with service does not unprovision, but detach service", async () => {
    expect(memcached_response).to.be.an('object');
    expect(memcached_plan).to.be.an('object');
    expect(memcached_plan.id).to.be.a('string');
    let data = await httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/addons/' + memcached_response.id, alamo_headers, null);
    expect(data).to.be.a('string');
    let obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(memcached_response.id);
  });
  it("covers deleting the test app for services", async () => {
    let data = await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default`, alamo_headers, null);
    expect(data).to.be.a('string');
  });
  it("covers deleting the test app for services", async () => {
    let data = await httph.request('delete', `http://localhost:5000/apps/${appname_third_new}-preview`, alamo_headers, null);
    expect(data).to.be.a('string');
  });
});
