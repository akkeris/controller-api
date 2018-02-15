"use strict"

const init = require('./support/init.js');

describe("metrics: ensure we can pull app metrics", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};
  const running_app = require('../index.js');
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;

  function check_feature(obj) {
    expect(obj.name).to.a('string')
    expect(obj.id).to.be.a('string')
    expect(obj.doc_url).to.be.a('string')
    expect(obj.state).to.be.a('string')
    expect(obj.display_name).to.be.a('string')
    expect(obj.feedback_email).to.be.a('string')
    expect(obj.enabled).to.be.a('boolean')
  }

  it("covers listing features", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let arr = JSON.parse(data);
      expect(arr).to.be.an('array');
      let f = arr.filter((x) => x.name === "auto-release")
      expect(f.length).to.equal(1)
      check_feature(f[0])
      expect(f[0].enabled).to.equal(false)
      done();
    });
  });


  it("covers getting feature", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(false)
      done();
    });
  });


  
  it("covers enabling feature", (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, {"enabled":true}, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(true)
      done();
    });
  });


  it("covers listing features (enabled)", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let arr = JSON.parse(data);
      expect(arr).to.be.an('array');
      let f = arr.filter((x) => x.name === "auto-release")
      expect(f.length).to.equal(1)
      check_feature(f[0])
      expect(f[0].enabled).to.equal(true)
      done();
    });
  });


  it("covers enabling feature again", (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, {"enabled":true}, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(true)
      done();
    });
  });

  it("covers getting features (enabled)", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(true)
      done();
    });
  });


  
  it("covers disabling feature", (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, {"enabled":false}, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(false)
      done();
    });
  });


  it("covers listing features (disabled)", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let arr = JSON.parse(data);
      expect(arr).to.be.an('array');
      let f = arr.filter((x) => x.name === "auto-release")
      expect(f.length).to.equal(1)
      check_feature(f[0])
      expect(f[0].enabled).to.equal(false)
      done();
    });
  });

  
  it("covers disabling feature again", (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, {"enabled":false}, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(false)
      done();
    });
  });


  it("covers getting feature (disabled)", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null
      expect(data).to.be.a('string')
      let arr = JSON.parse(data)
      expect(arr).to.be.an('object')
      check_feature(arr)
      expect(arr.name).to.equal("auto-release")
      expect(arr.enabled).to.equal(false)
      done();
    });
  });
  
  it("covers ensuring feature that does not exist returns 404 on patch", (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/non-existant', alamo_headers, {"enabled":false}, 
    (err, data) => {
      expect(err).to.be.an('object')
      expect(err.code).to.equal(404)
      expect(data).to.be.null
      done();
    });
  });
  
  it("covers ensuring feature that does not exist returns 404 on get", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/non-existant', alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.an('object')
      expect(err.code).to.equal(404)
      expect(data).to.be.null
      done();
    });
  });
  

})