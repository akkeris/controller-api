"use strict"

const init = require('./support/init.js');
describe("app-setups:", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";


    
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
          if(data) {
            console.log("got data:", data)
          }
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


  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "x-username":"test", "x-elevated-access":"true"};

  let appname = "alamotest" + Math.floor(Math.random() * 10000)
  let app_uuid = null;
  let app_setup_uuid = null;
  it("ensure we can create an app from a definition", (done) => {
    let payload = {
      "app": {
        "locked": false,
        "name": appname,
        "organization": "alamo",
        "region": "us-seattle",
        "personal": false,
        "space": "default",
        "stack": "ds1"
      },
      "env": {
        "FEEBAR": {
          "description": "",
          "required": true,
          "value":"FOOBAR"
        },
        "FUGAZI": {
          "description": "",
          "required": false,
          "value": "FUGAZI!!!"
        },
        "AUTH_KEY": {
          "description": "",
          "required": false,
          "value": "AUTH_KEY"
        }
      },
      "formation": {
        "web": {
          "quantity": 1,
          "size": "scout",
          "command": null,
          "port":5000
        }
      },
      "addons": {},
      "source_blob": {
        "checksum": "sha256:93f16649a03d37aef081dfec3c2fecfa41bb22dd45de2b79f32dcda83bd69bcf",
        "url": "docker://docker.io/akkeris/test-lifecycle:latest",
        "version": "v1.0"
      },
      "log-drains": [
        {
          "url":"syslog+tls://logs.apps.com:40841", 
          "token":"fugazi"
        }
      ],
      "features":[
        {"name":"auto-release","enabled":true,"id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44"}
      ],
      "pipeline-couplings": [],
      "sites": {}
    }
    httph.request('post', 'http://localhost:5000/app-setups', alamo_headers, JSON.stringify(payload), (err, data) => {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      expect(data).to.be.an('object');
      expect(data.id).to.be.a('string');
      app_setup_uuid = data.id;
      expect(data.created_at).to.be.a('string');
      expect(data.updated_at).to.be.a('string');
      expect(data.app).to.be.an('object');
      expect(data.app.id).to.be.a('string');
      expect(data.build).to.be.an('object');
      expect(data.status).to.equal('pending');
      expect(data.progress).to.equal(0);
      app_uuid = data.app.id;
      done();
    });
  });

  it("ensure we can check the status of app creation", (done) => {
    let intv = setInterval(() => {
      httph.request('get', 'http://localhost:5000/app-setups/' + app_setup_uuid, alamo_headers, null, (err, data) => {
        expect(err).to.be.null;
        data = JSON.parse(data);
        expect(data).to.be.an('object');
        expect(data.id).to.be.a('string');
        expect(data.created_at).to.be.a('string');
        expect(data.updated_at).to.be.a('string');
        expect(data.app).to.be.an('object');
        expect(data.app.id).to.be.a('string');
        if(data.progress === 1) {
          expect(data.status).to.equal("succeeded")
          clearInterval(intv)
          done();
        }
      });
    }, 1500);
  });

  it("ensure the app setup starts the build", (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/apps/' + appname + '-default/builds', alamo_headers, null, (err, data) => {
        expect(err).to.be.null;
        let builds = JSON.parse(data)
        expect(builds.length).to.equal(1)
        wait_for_build(httph, `${appname}-default`, builds[0].id, (wait_err, building_info) => {
          if(wait_err) {
            console.error("Error waiting for build:", wait_err);
            return expect(true).to.equal(false);
          }
          done();
        })
      })
    }, 1000)
  })

  it("ensure the app auto-deploys", (done) => {
    wait_for_app_content(httph, `${appname}`, '[setting return value failed.] with port [5000] and restart value [undefined]', (wait_app_err, resp) => {
      if(wait_app_err) {
        console.error("Error waiting for build:", wait_app_err);
        return expect(true).to.equal(false);
      }
      done();
    })
  })

  it("ensure app setups created the config vars", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname + '-default/config-vars', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.an('object');
      expect(config_vars.FEEBAR).to.equal("FOOBAR");
      expect(config_vars.FUGAZI).to.equal("FUGAZI!!!");
      done();
    });
  });
  it("ensure app setups created the formation", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname + '-default/formation', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      let formation = JSON.parse(data);
      expect(formation).to.be.an('array');
      expect(formation[0]).to.be.an('object');
      expect(formation[0].command).to.be.null;
      expect(formation[0].quantity).to.equal(1);
      expect(formation[0].size).to.equal('scout');
      expect(formation[0].type).to.equal('web');
      done();
    });
  });


  it("ensure we can get an app definition", (done) => {
    httph.request('get', 'http://localhost:5000/apps/' + appname + '-default/app-setups', alamo_headers, null, (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      expect(data).to.be.an('object');
      expect(data.app).to.be.an('object');
      expect(data.app.name).to.equal(appname);
      expect(data.app.organization).to.be.a('string');
      expect(data.app.space).to.equal('default');
      expect(data.env).to.be.an('object');
      expect(data.env.AUTH_KEY).to.be.an('object');
      expect(data.env.AUTH_KEY.required).to.be.true;
      expect(data.env.AUTH_KEY.value).to.be.undefined;
      expect(data.env.PORT).to.be.an('object');
      expect(data.env.PORT.required).to.be.false;
      expect(data.env.PORT.value).to.equal("5000");
      expect(data.formation).to.be.an('object');
      expect(data.formation.web).to.be.an('object');
      expect(data.formation.web.quantity).to.equal(1);
      expect(data.formation.web.size).to.equal('scout');
      expect(data.formation.web.command).to.be.null;
      expect(data.source_blob).to.be.an('object');
      expect(data.source_blob.checksum).to.be.a('string');
      expect(data.source_blob.url).to.be.a.a('string');
      expect(data.source_blob.version).to.be.a.a('string');
      done();
    });
  });


  it("ensure we clean up after ourselves", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + appname + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      done();
    });
  });
});
