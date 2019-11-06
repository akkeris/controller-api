"use strict"

describe("app-setups:", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";
  const init = require('./support/init.js');
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "x-username":"test", "x-elevated-access":"true"};

  let appname = "alamotest" + Math.floor(Math.random() * 100000)
  let app_uuid = null;
  let app_setup_uuid = null;
  it("ensure we can create an app from a definition", async () => {
    let payload = {
      "app": {
        "locked": false,
        "name": appname,
        "organization": "test",
        "personal": false,
        "space": "default",
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
          "size": "gp1",
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
    let data = JSON.parse(await httph.request('post', 'http://localhost:5000/app-setups', alamo_headers, JSON.stringify(payload)));
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
  });

  it("ensure we can check the status of app creation", (done) => {
    let intv = setInterval(async () => {
      let data = JSON.parse(await httph.request('get', `http://localhost:5000/app-setups/${app_setup_uuid}`, alamo_headers, null));
      expect(data).to.be.an('object');
      expect(data.id).to.be.a('string');
      expect(data.created_at).to.be.a('string');
      expect(data.updated_at).to.be.a('string');
      expect(data.app).to.be.an('object');
      expect(data.app.id).to.be.a('string');
      if(data.progress === 1) {
        clearInterval(intv)
        expect(data.status).to.equal("succeeded")
        done();
      }
    }, 1500);
  });

  it("ensure the app setup starts the build", async () => {
    let builds = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${appname}-default/builds`, alamo_headers, null));
    expect(builds.length).to.equal(1)
    await init.wait_for_build(`${appname}-default`, builds[0].id)
  })

  it("ensure the app auto-deploys", async () => {
    await init.wait_for_app_content(`${appname}`, '[setting return value failed.] with port [5000]');
  })


  it("Ensures we can place the application into maintenance mode.", async () => {
    let data = await httph.request('patch', `http://localhost:5000/apps/${appname}-default`, alamo_headers, JSON.stringify({"maintenance":true}));
    let appobj = JSON.parse(data);
    expect(appobj).to.be.an('object');
    expect(appobj.archived_at).to.be.a('string');
    expect(appobj.buildpack_provided_description).to.be.a('string');
    expect(appobj.build_stack).to.be.an('object');
    expect(appobj.build_stack.id).to.be.a('string');
    expect(appobj.build_stack.name).to.be.a('string');
    expect(appobj.created_at).to.be.a('string');
    expect(appobj.id).to.be.a('string');
    expect(appobj.maintenance).to.equal(true);
    expect(appobj.name).to.equal(appname + "-default");
    expect(appobj.simple_name).to.equal(appname);
    expect(appobj.key).to.equal(appname + "-default");
    expect(appobj.owner).to.be.an('object');
    expect(appobj.organization).to.be.an('object');
    expect(appobj.region).to.be.an('object');
    expect(appobj.region.name).to.be.a('string');
    expect(appobj.repo_size).to.equal(0);
    expect(appobj.slug_size).to.equal(0);
    expect(appobj.space).to.be.an('object');
    expect(appobj.space.name).to.equal("default");
    expect(appobj.stack).to.be.an('object');
    expect(appobj.updated_at).to.be.a('string');
    expect(appobj.web_url).to.contain("https://" + appname + process.env.ALAMO_BASE_DOMAIN);
  });

  it("Ensures we can take the application out of maintenance mode.", async () => {
    let data = await httph.request('patch', `http://localhost:5000/apps/${appname}-default`, alamo_headers, JSON.stringify({"maintenance":false}));
    let appobj = JSON.parse(data);
    expect(appobj).to.be.an('object');
    expect(appobj.archived_at).to.be.a('string');
    expect(appobj.buildpack_provided_description).to.be.a('string');
    expect(appobj.build_stack).to.be.an('object');
    expect(appobj.build_stack.id).to.be.a('string');
    expect(appobj.build_stack.name).to.be.a('string');
    expect(appobj.created_at).to.be.a('string');
    expect(appobj.id).to.be.a('string');
    expect(appobj.maintenance).to.equal(false);
    expect(appobj.name).to.equal(appname + "-default");
    expect(appobj.simple_name).to.equal(appname);
    expect(appobj.key).to.equal(appname + "-default");
    expect(appobj.owner).to.be.an('object');
    expect(appobj.organization).to.be.an('object');
    expect(appobj.region).to.be.an('object');
    expect(appobj.region.name).to.be.a('string');
    expect(appobj.repo_size).to.equal(0);
    expect(appobj.slug_size).to.equal(0);
    expect(appobj.space).to.be.an('object');
    expect(appobj.space.name).to.equal("default");
    expect(appobj.stack).to.be.an('object');
    expect(appobj.updated_at).to.be.a('string');
    expect(appobj.web_url).to.contain("https://" + appname + process.env.ALAMO_BASE_DOMAIN);
  });

  it("ensure the app comes out of maintenance mode", async () => {
    await init.wait_for_app_content(`${appname}`, '[setting return value failed.] with port [5000]');
  })


  it("ensure app setups created the config vars", async () => {
    let config_vars = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${appname}-default/config-vars`, alamo_headers, null));
    expect(config_vars).to.be.an('object');
    expect(config_vars.FEEBAR).to.equal("FOOBAR");
    expect(config_vars.FUGAZI).to.equal("FUGAZI!!!");
  });

  it("ensure app setups created the formation", async () => {
    let formation = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${appname}-default/formation`, alamo_headers, null));
    expect(formation).to.be.an('array');
    expect(formation[0]).to.be.an('object');
    expect(formation[0].command).to.be.null;
    expect(formation[0].quantity).to.equal(1);
    expect(formation[0].size).to.equal('gp1');
    expect(formation[0].type).to.equal('web');
  });

  it("ensure we can get an app definition", async () => {
    let data = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${appname}-default/app-setups`, alamo_headers, null));
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
    expect(data.formation.web.size).to.equal('gp1');
    expect(data.formation.web.command).to.be.null;
    expect(data.source_blob).to.be.an('object');
    expect(data.source_blob.checksum).to.be.a('string');
    expect(data.source_blob.url).to.be.a.a('string');
    expect(data.source_blob.version).to.be.a.a('string');
  });

  it("ensure we clean up after ourselves", async () => {
    await httph.request('delete', `http://localhost:5000/apps/${appname}-default`, alamo_headers, null)
  });
});
