"use strict"

const init = require('./support/init.js');
describe("app-setups:", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";

  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  const alamo_headers = {"Authorization":process.env.AUTH_KEY};

  it("ensure we can get an app definition", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/app-setups', alamo_headers, null, (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      expect(data).to.be.an('object');
      expect(data.app).to.be.an('object');
      expect(data.app.name).to.equal('api');
      expect(data.app.organization).to.be.a('string');
      expect(data.app.region).to.equal('us');
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
      expect(data.formation.web.size).to.equal('constellation');
      expect(data.formation.web.command).to.be.null;
      expect(data.source_blob).to.be.an('object');
      expect(data.source_blob.checksum).to.be.a('string');
      expect(data.source_blob.url).to.be.a.a('string');
      expect(data.source_blob.version).to.be.a.a('string');
      done();
    });
  });

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
        }
      },
      "formation": {
        "web": {
          "quantity": 1,
          "size": "scout",
          "command": null
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
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/app-setups/' + app_setup_uuid, alamo_headers, null, (err, data) => {
        expect(err).to.be.null;
        data = JSON.parse(data);
        expect(data).to.be.an('object');
        expect(data.id).to.be.a('string');
        expect(data.created_at).to.be.a('string');
        expect(data.updated_at).to.be.a('string');
        expect(data.app).to.be.an('object');
        expect(data.app.id).to.be.a('string');
        done();
      });
    }, 1000);
  });

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
  it("ensure we clean up after ourselves", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + appname + '-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      done();
    });
  });
});
