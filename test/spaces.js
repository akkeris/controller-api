"use strict"

const init = require('./support/init.js');
describe("spaces: ensure we can pull and list spaces", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.TEST_MODE = "true"; // prevents creating actual spaces.  Since we cant delete them, we bail out before committing.
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;

  it("covers listing spaces", (done) => {
    httph.request('get', 'http://localhost:5000/spaces', alamo_headers, null, 
    (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        done();
    });
  });
  
  it("covers getting spaces", (done) => {
    httph.request('get', 'http://localhost:5000/spaces', alamo_headers, null, 
    (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        httph.request('get', 'http://localhost:5000/spaces/' + obj[0].name, alamo_headers, null, 
        (err, space) => {
          expect(err).to.be.null;
          expect(space).to.be.a('string');
          space = JSON.parse(space);
          expect(space).to.be.a('object');
          expect(space.id).to.be.a('string');
          done();
        });
    });
  });

  it("covers not allowing duplicate spaces to be created", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"default", description:"FFFUUUUGGGAAZZIII!!!"}), 
    (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
    });
  });
  it("covers not allowing protected spaces to be created", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"kube-system", description:"FFFUUUUGGGAAZZIII!!!"}), 
    (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
    });
  });
  it("covers not allowing protected spaces to be created", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"k2-poc", description:"FFFUUUUGGGAAZZIII!!!"}), 
    (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
    });
  });
  it("covers not allowing protected spaces to be created", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"kube-public", description:"FFFUUUUGGGAAZZIII!!!"}), 
    (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
    });
  });
  it("covers checking spaces name", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"!!! YEAH !!!", description:"FFFUUUUGGGAAZZIII!!!"}), 
    (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
    });
  });
  it("partially covers creating spaces", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"fugazi", description:"FFFUUUUGGGAAZZIII!!!"}), 
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj.test).to.equal('did not create a space, but successful. internal = false');
      done();
    });
  });
  it("partially covers creating internal spaces", (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"fugazi", compliance: ["internal"], description:"FFFUUUUGGGAAZZIII!!!"}),
    (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj.test).to.equal('did not create a space, but successful. internal = true');
      done();
    });
  });
});