"use strict"

const init = require('./support/init.js');
describe("plugins: creating, listing, updating deleting", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;

  it("covers creating plugins", (done) => {
    httph.request('post', 'http://localhost:5000/plugins', alamo_headers, JSON.stringify({name:"testing",repo:"https://foo.com", owner:"owner", email:"email@email.com", description:"description"}), 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.name).to.equal("testing");
        expect(obj.repo).to.equal("https://foo.com");
        expect(obj.owner).to.an('object');
        expect(obj.owner.name).to.equal("owner");
        expect(obj.owner.email).to.equal("email@email.com");
        expect(obj.description).to.equal("description");
        done();
    });
  });
  it("covers listing plugins", (done) => {
    httph.request('get', 'http://localhost:5000/plugins', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let test_plugin = null;
        obj.forEach((x) => {
          if(x.name === 'testing') {
            test_plugin = x;
          }
        });
        expect(test_plugin.name).to.equal("testing");
        expect(test_plugin.repo).to.equal("https://foo.com");
        expect(test_plugin.owner).to.an('object');
        expect(test_plugin.owner.name).to.equal("owner");
        expect(test_plugin.owner.email).to.equal("email@email.com");
        expect(test_plugin.description).to.equal("description");
        done();
    });
  });
  it("covers getting plugin info", (done) => {
    httph.request('get', 'http://localhost:5000/plugins/testing', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.name).to.equal("testing");
        expect(obj.repo).to.equal("https://foo.com");
        expect(obj.owner).to.an('object');
        expect(obj.owner.name).to.equal("owner");
        expect(obj.owner.email).to.equal("email@email.com");
        expect(obj.description).to.equal("description");
        done();
    });
  });
  it("covers updating plugins", (done) => {
    httph.request('patch', 'http://localhost:5000/plugins/testing', alamo_headers, JSON.stringify({repo:"https://foo2.com", owner:"owner2", email:"email2@email.com", description:"description2"}), 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.name).to.equal("testing");
        expect(obj.repo).to.equal("https://foo2.com");
        expect(obj.owner).to.an('object');
        expect(obj.owner.name).to.equal("owner2");
        expect(obj.owner.email).to.equal("email2@email.com");
        expect(obj.description).to.equal("description2");
        done();
    });
  });
  it("covers ensuring plugin was updated", (done) => {
    httph.request('get', 'http://localhost:5000/plugins/testing', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.name).to.equal("testing");
        expect(obj.repo).to.equal("https://foo2.com");
        expect(obj.owner).to.an('object');
        expect(obj.owner.name).to.equal("owner2");
        expect(obj.owner.email).to.equal("email2@email.com");
        expect(obj.description).to.equal("description2");
        done();
    });
  });
  it("covers deleting plugin", (done) => {
    httph.request('delete', 'http://localhost:5000/plugins/testing', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.name).to.equal("testing");
        expect(obj.repo).to.equal("https://foo2.com");
        expect(obj.owner).to.an('object');
        expect(obj.owner.name).to.equal("owner2");
        expect(obj.owner.email).to.equal("email2@email.com");
        expect(obj.description).to.equal("description2");
        done();
    });
  });
  it("covers ensuring plugin was deleted", (done) => {
    httph.request('get', 'http://localhost:5000/plugins', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let test_plugin = null;
        obj.forEach((x) => {
          if(x.name === 'testing') {
            test_plugin = x;
          }
        });
        expect(test_plugin).to.equal(null);
        done();
    });
  });
  it("covers ensuring we get a 404 on deleted plugin", (done) => {
    httph.request('get', 'http://localhost:5000/plugins/testing', alamo_headers, null, 
      (err, data) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(404);
        expect(data).to.be.null;
        done();
    });
  });
})