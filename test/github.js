"use strict"

process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

let github = require('../lib/github.js');
let common = require('../lib/common.js');
const expect = require("chai").expect;

const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello"};


describe("github: enc/dec tokens, checks against incoming payloads", function() {
  this.timeout(100000);
  const running_app = require('../index.js');
  const httph = require('../lib/http_helper.js');

  it("covers calculating hashes and encryption", (done) => {
    expect(github.calculate_hash("SECRET", "ABCDEFGHIJLKMNOPQRSTUVWXYZ")).to.equal("sha1=5867f5d4b01da52c034fedfa1f96bc5605652019");
    expect(common.decrypt_token("SECRET",common.encrypt_token("SECRET","FUGAZI!"))).to.equal("FUGAZI!");
    done();
  });
  it("covers getting auto build", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/builds/auto/github', alamo_headers, null, (err, data) => {
      if(err) {
        console.error('Error:')
        console.error(err)
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
});
