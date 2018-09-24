"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const init = require('./support/init.js');
const httph = require('../lib/http_helper.js');
const expect = require("chai").expect;
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};


describe("config-vars: creating, updating and deleting a config vars", function() {  
  this.timeout(100000);
  let appname_brand_new = "alamotest" + Math.floor(Math.random() * 10000)
  it("covers getting default config vars", (done) => {
    // create an app.
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:appname_brand_new}), 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      // get the config vars
      httph.request('get', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, null, (err, data) => {
        expect(err).to.be.null;
        let config_vars = JSON.parse(data);
        expect(config_vars).to.be.a('object');
        expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
        done();
      });
    });
  });
  it("covers adding config vars", (done) => {
    // add a config var
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({FOO:"BAR"}), (err, data) => {
      expect(err).to.be.null;
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.equal("BAR");
      done();
    });
  });

  it("covers audit events for a config var", (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app='+ appname_brand_new + '&space=default', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.some((x)=> x.action === 'config_change')).to.eql(true);
        done();
    });
    }, 5000);
  });

  it("covers adding invalid config vars", (done) => {
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({"NOT-ALLOWED":"BOO"}), (err, data) => {
      expect(err).to.be.an('object');
      expect(err.message).to.equal('The config variable NOT-ALLOWED is invalid. Configuration variables must be alpha numeric names but may contain underscores.');
      expect(data).to.be.null;
      done();
    });
  });
  it("covers adding sensitive vars", (done) => {
    // add a config var
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({FOO_API_TOKEN:"NOPE"}), (err, data) => {
      expect(err).to.be.null;
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.equal("BAR");
      expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
      done();
    });
  });

  it("covers ensuring removing a config var that doesn't exist errors", async (done) => {
    try {
      let data = await httph.request('patch', `http://localhost:5000/apps/${appname_brand_new}-default/config-vars`, Object.assign(alamo_headers, {"x-silent-error":"true"}), JSON.stringify({"REMOVE_NON_EXISTANT":null}));
      done(new Error('The config var that was removed didnt exist but was removed anyway.'));
    } catch (e) {
      done()
    }
  });

  it("covers adding empty value config vars", async (done) => {
    try {
      let data = await httph.request('patch', `http://localhost:5000/apps/${appname_brand_new}-default/config-vars`, alamo_headers, JSON.stringify({"EMPTY_CONFIG_VAR":""}));
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.equal("BAR");
      expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
      expect(config_vars.EMPTY_CONFIG_VAR).to.equal("");
      done();
    } catch (e) {
      done(e)
    }
  });
  it("covers getting empty value config vars", async (done) => {
    try {
      let data = await httph.request('get', `http://localhost:5000/apps/${appname_brand_new}-default/config-vars`, alamo_headers, null);
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.equal("BAR");
      expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
      expect(config_vars.EMPTY_CONFIG_VAR).to.equal("");
      done();
    } catch (e) {
      done(e)
    }
  });
  it("covers updating empty value config vars", async (done) => {
    try {
      let data = await httph.request('patch', `http://localhost:5000/apps/${appname_brand_new}-default/config-vars`, alamo_headers, JSON.stringify({"EMPTY_CONFIG_VAR":"NOT EMPTY"}));
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.equal("BAR");
      expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
      expect(config_vars.EMPTY_CONFIG_VAR).to.equal("NOT EMPTY");
      done();
    } catch (e) {
      done(e)
    }
  });
  it("covers adding url with sensitive vars", (done) => {
    setTimeout(() => {
      // add a config var
      httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({SENSITIVE:"https://foo:bar@hostnamme.com/path/"}), (err, data) => {
        expect(err).to.be.null;
        let config_vars = JSON.parse(data);
        expect(config_vars).to.be.a('object');
        expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
        expect(config_vars.FOO).to.equal("BAR");
        expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
        expect(config_vars.SENSITIVE).to.equal("https://foo:[redacted]@hostnamme.com/path/");
        done();
      });
    }, 1000);
  });
  it("covers ensuring addon info does not leak config vars", async (done) => {
    try {
      let postgresdb = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${appname_brand_new}-default/addons`, alamo_headers, JSON.stringify({"plan":"alamo-postgresql:hobby"})));
      let info = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgresdb.id}`, alamo_headers, null));
      let cvs = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${appname_brand_new}-default/config-vars`, alamo_headers, null));
      expect(info.config_vars.DATABASE_URL).to.equal(cvs.DATABASE_URL);
      expect(info.config_vars.DATABASE_URL.includes('[redacted]')).to.equal(true);
      done();
    } catch (e) {
      done(e);
    }
  });
  it("covers updating config vars", (done) => {
    // update a config var
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({FOO:"GAZI"}), (err, data) => {
      expect(err).to.be.null;
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.equal("GAZI");
      expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
      done();
    });
  });
  it("covers deleting config vars", (done) => {
    // delete a config var
    httph.request('patch', 'http://localhost:5000/apps/' + appname_brand_new + '-default/config-vars', alamo_headers, JSON.stringify({FOO:null}), (err, data) => {
      expect(err).to.be.null;
      let config_vars = JSON.parse(data);
      expect(config_vars).to.be.a('object');
      expect(config_vars.PORT).to.equal(process.env.DEFAULT_PORT);
      expect(config_vars.FOO).to.be.undefined;
      expect(config_vars.FOO_API_TOKEN).to.equal("[redacted]");
      expect(config_vars.SENSITIVE).to.equal("https://foo:[redacted]@hostnamme.com/path/");
      done();
    });
  });
  it("covers removing test app.", (done) => {
    // destroy the app.
    delete alamo_headers['X-UserName'];
    httph.request('delete', 'http://localhost:5000/apps/' + appname_brand_new + '-default', alamo_headers, null, (err, data) => {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
});