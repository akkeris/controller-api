"use strict"

describe("organizations: ensure we can pull and list orgs", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};
  const running_app = require('../index.js');
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;

  function validate_org(obj) {
    expect(obj.created_at).to.be.a('string')
    expect(obj.id).to.be.a('string')
    expect(obj.updated_at).to.be.a('string')
    expect(obj.role).to.be.a('string')
    expect(obj.name).to.be.a('string')
  }

  it("covers listing orgs", (done) => {
    httph.request('get', 'http://localhost:5000/organizations', alamo_headers, null, 
    (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach(validate_org)
        done();
    });
  });
  it("covers getting specific organization", (done) => {
    httph.request('get', 'http://localhost:5000/organizations', alamo_headers, null, 
    (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach(validate_org)
        httph.request('get', 'http://localhost:5000/organizations/' + obj[0].name, alamo_headers, null, 
        (err, space) => {
          expect(err).to.be.null;
          expect(space).to.be.a('string');
          space = JSON.parse(space);
          expect(space).to.be.a('object');
          expect(space.id).to.be.a('string');
          validate_org(space)
          done();
        });
    });
  });

  it("covers ensuring you cannot create a duplicate organization", (done) => {
    httph.request('post', 'http://localhost:5000/organizations', alamo_headers, 
      JSON.stringify({"name":"test", "description":"foo"}), 
    (err, data) => {
      expect(err).to.be.an('object')
      expect(data).to.be.null
      done()
    });
  });

  let org_name = "test" + Math.round(Math.random() * 10000000);
  it("covers creating organizations", (done) => {
    httph.request('post', 'http://localhost:5000/organizations', alamo_headers, 
      JSON.stringify({"name":org_name, "description":"test description"}), 
    (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      validate_org(obj)
      expect(obj.name).to.equal(org_name)
      expect(obj.description).to.equal("test description")
      done()
    });
  });

  it("covers ensuring elevated access can only delete organizations", (done) => {
    httph.request('delete', 'http://localhost:5000/organizations/' + org_name, Object.assign({'x-username':'foo'}, alamo_headers), null, 
    (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(403)
      done()
    });
  });

  it("covers delete organizations", (done) => {
    httph.request('delete', 'http://localhost:5000/organizations/' + org_name, alamo_headers, null, 
    (err, data) => {
      expect(err).to.be.null;
      done()
    });
  });


});