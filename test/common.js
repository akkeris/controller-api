"use strict"

const init = require('./support/init.js');
const expect = require("chai").expect;
const assert = require("chai").assert;
const httph = require('../lib/http_helper.js');
const zlib = require('zlib')
process.env.AUTH_KEY = 'hello';
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};

describe("base: Ensure helper tools work correctly.", () => {
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const common = require('../lib/common.js');
  it("Ensures forward slashes are removed", (done) => {
    expect(httph.clean_forward_slash("https://fooo.com/")).to.equal("https://fooo.com");
    expect(httph.clean_forward_slash("https://fooo.com/foozle")).to.equal("https://fooo.com/foozle");
    expect(httph.clean_forward_slash("https://fooo.com/foozle/")).to.equal("https://fooo.com/foozle");
    done();
  });
  it("Ensures 404 works.", (done) => {
    httph.request('get', 'http://localhost:5000/foo', {}, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(404);
      done();
    });
  });
  it("Ensures authentication works.", (done) => {
    httph.request('get', 'http://localhost:5000/apps', {}, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(401);
      done();
    });
  });
  it("Ensures successful match.", (done) => {
    let match = httph.first_match("http://localhost:5000/apps/hello", new RegExp('/apps/([A-z0-9\\-\\_\\.]+)$'));
    expect(match).to.equal("hello");
    done();
  });
  it("Ensures spaces do not match.", (done) => {
    let match = httph.first_match("http://localhost:5000/apps/h ello", new RegExp('/apps/([A-z0-9\\-\\_\\.]+)$'));
    expect(match).to.be.null
    done();
  });
  it("Ensures check uuid works.", (done) => {
    try { 
      common.check_uuid("uuid")
      expect(false).to.equal(true)
    } catch (e) {
      expect(true).to.equal(true)
    }
    try { 
      common.check_uuid("123e4567-e89b-12d3-a456-426655440000")
      expect(true).to.equal(true)
    } catch (e) {
      console.log(e)
      expect(false).to.equal(true)
    }
    done();
  });
  it("Ensure gzip compression works.", (done) => {
    httph.request('get', 'http://localhost:5000/apps', Object.assign({"accept-encoding":"gzip"}, alamo_headers), null, (err, data) => {
      expect(err).to.be.null
      expect(JSON.parse(data)).to.be.an('array')
      done();
    });
  })
});