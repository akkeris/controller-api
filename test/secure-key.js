"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const init = require('./support/init.js');
const httph = require('../lib/http_helper.js');
const expect = require("chai").expect;
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", 'x-elevated-access':'true'};
const util = require('util')
const request = util.promisify(httph.request)


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
function wait_for_app_content(httph, app, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 60) {
    process.stdout.write("\n");
    callback({code:0, message:"Timeout waiting for app to turn up."});
  }
  setTimeout(function() {
    httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN + '/environment', {'X-Timeout':1500}, null, (err, data) => {
      if(err) {
        process.stdout.write(".");
        setTimeout(wait_for_app_content.bind(null, httph, app, callback, (iteration + 1)), 250);
      } else {
        process.stdout.write("\n");
        callback(null, data);
      }
    });
  },1000);
}

async function wfb(httph, app, build_id) {
  return new Promise((resolve, reject) => {
    wait_for_build(httph, app, build_id, (err, data) => {
      if(err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}
async function wfc(httph, app) {
  return new Promise((resolve, reject) => {
    wait_for_app_content(httph, app, (err, data) => {
      if(err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

describe("secure keys: creating, attaching and deleting", function() {  
  this.timeout(1000000);

  let first_app = "alamotestsk" + Math.floor(Math.random() * 10000)
  let second_app = "alamotestsk" + Math.floor(Math.random() * 10000)
  let unique_var1 = Math.random().toString()
  let unique_var2 = Math.random().toString()

  it("covers creating test apps", async (done) => {
    try {
      await request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"preview", name:first_app}))
      await request('post', `http://localhost:5000/apps/${first_app}-preview/formation`, alamo_headers, JSON.stringify({"type":"web","port":2000}))
      await request('patch', `http://localhost:5000/apps/${first_app}-preview/config-vars`, alamo_headers, JSON.stringify({"KEEP_ME":unique_var1}))
      await request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space:"preview", name:second_app}))
      await request('post', `http://localhost:5000/apps/${second_app}-preview/formation`, alamo_headers, JSON.stringify({"type":"web","port":2000}))
      await request('patch', `http://localhost:5000/apps/${second_app}-preview/config-vars`, alamo_headers, JSON.stringify({"KEEP_ME":unique_var2}))
      done()
    } catch (e) {
      done(e)
    }
  });

  let addon = null
  it("covers provisioning secure keys", async (done) => {
    try {
      addon = JSON.parse(await request('post', `http://localhost:5000/apps/${first_app}-preview/addons`, alamo_headers, JSON.stringify({"plan":"securekey:fortnightly"})))
      expect(addon.id).to.be.a('string')
      expect(addon.config_vars.SECURE_KEY).to.be.a('string')
      done()
    } catch (e) {
      done(e)
    }
  })

  it("covers ensuring key is in config vars", async (done) => {
    try {
      let config_vars = JSON.parse(await request('get', `http://localhost:5000/apps/${first_app}-preview/config-vars`, alamo_headers, null))
      expect(config_vars.SECURE_KEY).to.equal(addon.config_vars.SECURE_KEY)
      expect(config_vars.KEEP_ME).to.equal(unique_var1)
      done()
    } catch (e) {
      done(e)
    }
  })

  it("creates test app to ensure secure key reaches env", async (done) => {
    try {
      let build_payload = {"sha":"123456","org":"test","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"docker://docker.io/akkeris/test-sample:latest"};
      let build_info = JSON.parse(await request('post', `http://localhost:5000/apps/${first_app}-preview/builds`, alamo_headers, JSON.stringify(build_payload)))
      let build_info2 = JSON.parse(await request('post', `http://localhost:5000/apps/${second_app}-preview/builds`, alamo_headers, JSON.stringify(build_payload)))
      await wfb(httph, `${first_app}-preview`, build_info.id)
      await wfb(httph, `${second_app}-preview`, build_info2.id)
      let release_info = JSON.parse(await request('post', `http://localhost:5000/apps/${first_app}-preview/releases`, alamo_headers, JSON.stringify({"slug":build_info.id, "description":"secure key test"})))
      let release_info2 = JSON.parse(await request('post', `http://localhost:5000/apps/${second_app}-preview/releases`, alamo_headers, JSON.stringify({"slug":build_info2.id, "description":"secure key test"})))
      let content = JSON.parse(await wfc(httph, `${first_app}-preview`))
      expect(content.SECURE_KEY).to.equal(addon.config_vars.SECURE_KEY)
      expect(content.KEEP_ME).to.equal(unique_var1)
      done()
    } catch (e) {
      done(e)
    }
  })

  it("covers second app does not have config vars", async (done) => {
    try {
      let config_vars = JSON.parse(await request('get', `http://localhost:5000/apps/${second_app}-preview/config-vars`, alamo_headers, null))
      expect(config_vars.SECURE_KEY).to.be.undefined;
      expect(config_vars.KEEP_ME).to.equal(unique_var2)
      done()
    } catch (e) {
      done(e)
    }
  })

  let addon_attachment = null
  it("covers adding first secure key to second app", async (done) => {
    try {
      addon_attachment = JSON.parse(await request('post', `http://localhost:5000/apps/${second_app}-preview/addon-attachments`, alamo_headers, JSON.stringify({"addon":addon.name, "app":`${second_app}-preview`, "force":true, "name":"securekey"})))
      let config_vars = JSON.parse(await request('get', `http://localhost:5000/apps/${second_app}-preview/config-vars`, alamo_headers, null))
      expect(config_vars.SECURE_KEY).to.equal(addon.config_vars.SECURE_KEY)
      expect(config_vars.KEEP_ME).to.equal(unique_var2)
      done()
    } catch (e) {
      done(e)
    }
  })



  it("covers rotating secure keys", async (done) => {
    try {
      await request('post', `http://localhost:5000/apps/${first_app}-preview/addons/${addon.id}/actions/rotate`, alamo_headers, null)
      let config_vars = JSON.parse(await request('get', `http://localhost:5000/apps/${second_app}-preview/config-vars`, alamo_headers, null))
      let config_vars2 = JSON.parse(await request('get', `http://localhost:5000/apps/${first_app}-preview/config-vars`, alamo_headers, null))
      expect(config_vars.SECURE_KEY).to.not.equal(addon.config_vars.SECURE_KEY)
      expect(config_vars.SECURE_KEY).to.equal(config_vars2.SECURE_KEY)
      expect(config_vars2.KEEP_ME).to.equal(unique_var1)
      expect(config_vars.KEEP_ME).to.equal(unique_var2)
      let secondary1 = addon.config_vars.SECURE_KEY.split(",")[0]
      let primary2 = config_vars.SECURE_KEY.split(",")[1]
      expect(secondary1).to.equal(primary2)
      done()
    } catch (e) {
      done(e)
    }
  })

  it("covers removing test apps.", async (done) => {
    try {
      await request('delete', `http://localhost:5000/apps/${second_app}-preview`, alamo_headers, null)
      await request('delete', `http://localhost:5000/apps/${first_app}-preview`, alamo_headers, null)
      done()
    } catch (e) {
      done(e)
    }
  });
});