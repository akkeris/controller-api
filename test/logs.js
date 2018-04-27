"use strict"

const init = require('./support/init.js');

describe("logs: ensure we can pull app logs", function() {
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  var app_name = "alamotest" + Math.round(Math.random() * 10000);

  it("covers getting logging sessions", (done) => {
    httph.request('post', 'http://localhost:5000/apps/api-default/log-sessions', alamo_headers, JSON.stringify({lines:50,tail:false}),
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj.logplex_url).to.be.a('string');
      done();
    });
  });

  let id = null;
  it("covers creating log drain", (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:"default", name:app_name, size:"constellation", quantity:1, "type":"web", port:9000}),
      (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;

        // Create a log drain.
        httph.request('post', 'http://localhost:5000/apps/' + app_name + '-default/log-drains', alamo_headers,
          JSON.stringify({"url":"syslog+tls://logs.abcd.com:40481"}),
          (err, data) => {
            if(err) {
              console.log("Error in log drain craetion:", err);
            }
            expect(err).to.be.null;
            expect(data).to.be.a('string');
            data = JSON.parse(data);
            expect(data.id).to.be.a('string');
            id = data.id;
            done();
          });
      });
  });

  it("covers listing log drain", (done) => {
    expect(id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + app_name + '-default/log-drains', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data.length).to.equal(1);
      expect(data[0]).to.be.an('object');
      expect(data[0].id).to.equal(id);
      done();
    });
  });

  it("covers getting a log drain", (done) => {
    expect(id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + app_name + '-default/log-drains/' + id, alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('object');
      expect(data.id).to.equal(id);
      done();
    });
  });

  it("covers audit events for log drains", (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app=' + app_name + '&space=default', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj[0].action).to.eql("logdrain_change")
        done();
    });
    }, 5000);
  });

  it("covers deleting a log drain", (done) => {
    expect(id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/apps/' + app_name + '-default/log-drains/' + id, alamo_headers, null,
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      done();
    });
  });

  let addon_id = null;
  it("covers adding logdrain through papertrail plugin", (done) => {
    httph.request('post', 'http://localhost:5000/apps/' + app_name + '-default/addons', alamo_headers,
      JSON.stringify({"plan":"c0d522b4-5a6e-958f-aab4-12b1f628594d"}),
      (err, data) => {
        if(err) {
          console.log(err);
        }
        expect(err).to.be.null;
        data = JSON.parse(data);
        addon_id = data.id;
        done();
    });
  });

  it("covers listing log drain", (done) => {
    expect(id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + app_name + '-default/log-drains', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data.length).to.equal(1);
      expect(data[0]).to.be.an('object');
      done();
    });
  });
  it("covers removing logdrain through papertrail plugin", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + app_name + '-default/addons/' + addon_id, alamo_headers,
      null,
      (err, data) => {
        if(err) {
          console.log(err);
        }
        expect(err).to.be.null;
        done();
    });
  });

  it("covers ensuring no stray log drains", (done) => {
    expect(id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/apps/' + app_name + '-default/log-drains', alamo_headers, null,
    (err, data) => {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data.length).to.equal(0);
      done();
    });
  });

  it("Ensure we delete the test app.", (done) => {
    httph.request('delete', 'http://localhost:5000/apps/' + app_name + '-default', alamo_headers, null, (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
    });
  });
})