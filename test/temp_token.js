
"use strict"

describe("jwt tokens: ensure temporary tokens work appropriately", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";
  process.env.TEST_MODE = "true"
  const jose = require("node-jose");
  const expect = require("chai").expect;
  const init = require('./support/init.js');
  const common = require('../lib/common.js');
  const fs = require('fs');
  let private_key = fs.readFileSync('./test/support/sample-jwt-private-key.pem');
  let public_cert = fs.readFileSync('./test/support/sample-jwt-public-certificate.pem');

  it("Ensure issuing a token creates a valid token", async() => {
    let token = await common.create_temp_jwt_token(private_key, "some user", "http://localhost:5000", "http://localhost:5000", false, {"app_uuid":"3d9b756c-25dc-4ce9-b01e-3e8ed21956b1", "hook_id":"3d9b756c-25dc-4ce9-b01e-3e8ed2195555", "hook_type":"formation_change"})
    expect(token).to.be.a('string');
    let [header, claims, signature] = token.split(".");
    claims = jose.util.base64url.decode(claims).toString('utf8');
    let validated_claims = await common.jwks_verify(public_cert, "http://localhost:5000", "http://localhost:5000", claims, signature)
    expect(validated_claims.app_uuid).to.equal("3d9b756c-25dc-4ce9-b01e-3e8ed21956b1");
    expect(validated_claims.hook_id).to.equal("3d9b756c-25dc-4ce9-b01e-3e8ed2195555");
    expect(validated_claims.hook_type).to.equal("formation_change");
    expect(validated_claims.sub).to.equal("some user");
    expect(validated_claims.ele).to.equal(false);
    expect(validated_claims.aud).to.equal("http://localhost:5000");
    expect(validated_claims.iss).to.equal("http://localhost:5000");
    expect(validated_claims.exp).to.be.a("number");
    expect(validated_claims.nbf).to.be.a("number");

  })


});