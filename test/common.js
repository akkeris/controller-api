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
  });
  it("Ensure we redact passwords in uri's.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com");
    done();
  });
  it("Ensure we redact passwords in uri's with ports.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com:1234"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com:1234");
    done();
  });
  it("Ensure we redact passwords in uri's with paths no ports.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com/foo"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/foo");
    done();
  });
  it("Ensure we redact passwords in uri's with paths no ports and args.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com/foo?foo=bar"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/foo?foo=bar");
    done();
  });
  it("Ensure we redact passwords in uri's where it may appear as a query param.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com/foo?password=foobar"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/foo?password=[redacted]");
    done();
  });
  it("Ensure we redact passwords in uri's where it may appear as a query param with multiple args, first.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com/foo?password=foobar&justfine=true"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/foo?password=[redacted]&justfine=true");
    done();
  });
  it("Ensure we redact passwords in uri's where it may appear as a query param with multiple args, not-first.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com/foo?justfine=true&password=foobar"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/foo?justfine=true&password=[redacted]");
    done();
  });
  it("Ensure we redact passwords in uri's where it may appear as a query param with multiple args, middle.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:fee@host.com/foo?justfine=true&password=foobar&alsofine=true"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/foo?justfine=true&password=[redacted]&alsofine=true");
    done();
  });
  it("Ensure we redact passwords in uri's with a wide variety of characters.", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm!#$%^&*()_+-={}|[]\\:\";'<>?,./@host.com/path?arg=arg3224&foo=bar"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com/path?arg=arg3224&foo=bar");
    done();
  });
  it("Ensure we redact passwords in uri's with a wide variety of characters (with a port).", (done) => {
    let res = common.socs({"SOME_URI":"https://foobar:1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm!#$%^&*()_+-={}|[]\\:\";'<>?,./@host.com:1235/path?arg=arg3224&foo=bar"});
    expect(res.SOME_URI).to.equal("https://foobar:[redacted]@host.com:1235/path?arg=arg3224&foo=bar");
    done();
  });
  it("Ensure we redact passwords in uri's with a wide variety of characters (without a username).", (done) => {
    let res = common.socs({"SOME_URI":"https://:1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm!#$%^&*()_+-={}|[]\\:\";'<>?,./@host.com/path?arg=arg3224&foo=bar"});
    expect(res.SOME_URI).to.equal("https://:[redacted]@host.com/path?arg=arg3224&foo=bar");
    done();
  });
  it("Ensure we redact passwords where the key has a potentially sensitive name.", (done) => {
    let res = common.socs({"SOME_URI":"valid", "SOME_TOKEN":"should be redacted", "SOME_KEY":"should be also redacted", "SOME_PASS":"should be redacted?", "SOME_PASSWORD":"should be redacted", "SOME_SECRET":"should be redacted"});
    expect(res.SOME_URI).to.equal("valid");
    expect(res.SOME_TOKEN).to.equal("[redacted]");
    expect(res.SOME_PASS).to.equal("[redacted]");
    expect(res.SOME_PASSWORD).to.equal("[redacted]");
    expect(res.SOME_SECRET).to.equal("[redacted]");
    done();
  });
});