"use strict"

const running_app = require('../index.js');
const expect = require("chai").expect;
const assert = require("chai").assert;
const httph = require('../lib/http_helper.js');

describe("base: Ensure helper tools work correctly.", () => {
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
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
  it("Ensures does not match.", (done) => {
    let match = httph.first_match("http://localhost:5000/apps/h ello", new RegExp('/apps/([A-z0-9\\-\\_\\.]+)$'));
    expect(match).to.be.null
    done();
  });
});