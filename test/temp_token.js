/* eslint-disable no-unused-expressions */

describe('jwt tokens: ensure temporary tokens work appropriately', function () {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = '5000';
  process.env.TEST_MODE = 'true';
  const jose = require('node-jose');
  const { expect } = require('chai');
  const init = require('./support/init.js'); // eslint-disable-line
  const common = require('../lib/common.js');
  const fs = require('fs');
  const httph = require('../lib/http_helper.js');
  const private_key = fs.readFileSync('./test/support/sample-jwt-private-key.pem');
  const public_cert = fs.readFileSync('./test/support/sample-jwt-public-certificate.pem');
  const TTL_TEMP_TOKEN = 60 * 60;

  it('Ensure issuing a token creates a valid token', async () => {
    const token = await common.create_temp_jwt_token(
      private_key,
      'some user',
      'http://localhost:5000',
      'http://localhost:5000',
      false,
      {
        app_uuid: '3d9b756c-25dc-4ce9-b01e-3e8ed21956b1',
        hook_id: '3d9b756c-25dc-4ce9-b01e-3e8ed2195555',
        hook_type: 'formation_change',
      },
    );
    expect(token).to.be.a('string');
    const parts = token.split('.');
    let claims = parts[1];
    const signature = parts[2];
    claims = jose.util.base64url.decode(claims).toString('utf8');
    const validated_claims = await common.jwks_verify(public_cert,
      'http://localhost:5000',
      'http://localhost:5000',
      claims,
      signature);
    expect(validated_claims.app_uuid).to.equal('3d9b756c-25dc-4ce9-b01e-3e8ed21956b1');
    expect(validated_claims.hook_id).to.equal('3d9b756c-25dc-4ce9-b01e-3e8ed2195555');
    expect(validated_claims.hook_type).to.equal('formation_change');
    expect(validated_claims.sub).to.equal('some user');
    expect(validated_claims.ele).to.equal(false);
    expect(validated_claims.aud).to.equal('http://localhost:5000');
    expect(validated_claims.iss).to.equal('http://localhost:5000');
    expect(validated_claims.exp).to.be.a('number');
    expect(validated_claims.nbf).to.be.a('number');
  });

  it('Ensure expired tokens do not work', async () => {
    const payload = {
      sub: 'username', // who made the request. (https://tools.ietf.org/html/rfc7519#section-4.1.2)
      ele: false,
      aud: 'http://localhost:5000', // who this token is intended for. (https://tools.ietf.org/html/rfc7519#section-4.1.3)
      iss: 'http://localhost:5000', // who issued this token. (https://tools.ietf.org/html/rfc7519#section-4.1.1)
      exp: Math.floor((new Date()).getTime() / 1000) - TTL_TEMP_TOKEN * 40, // expiration date (https://tools.ietf.org/html/rfc7519#section-4.1.4)
      nbf: Math.floor((new Date()).getTime() / 1000) - TTL_TEMP_TOKEN * 50, // token is not valid before (https://tools.ietf.org/html/rfc7519#section-4.1.5)
      jti: Math.round(Math.random() * (Number.MAX_VALUE - 1)), // Random unique identifier for this temp token. (https://tools.ietf.org/html/rfc7519#section-4.1.7)
    };
    const token = common.sign_to_token(await common.jwks_sign(private_key, payload));
    expect(token).to.be.a('string');
    const parts = token.split('.');
    let claims = parts[1];
    const signature = parts[2];
    claims = jose.util.base64url.decode(claims).toString('utf8');
    let validated = false;
    try {
      await common.jwks_verify(public_cert, 'http://localhost:5000', 'http://localhost:5000', claims, signature);
      validated = true;
    } catch (e) {
      expect(e.message).to.equal('Unauthorized: token is expired, or has no "exp" field.');
    }
    expect(validated).to.equal(false);
  });

  it('Ensure nbf tokens do not work', async () => {
    const payload = {
      sub: 'username', // who made the request. (https://tools.ietf.org/html/rfc7519#section-4.1.2)
      ele: false,
      aud: 'http://localhost:5000', // who this token is intended for. (https://tools.ietf.org/html/rfc7519#section-4.1.3)
      iss: 'http://localhost:5000', // who issued this token. (https://tools.ietf.org/html/rfc7519#section-4.1.1)
      exp: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN * 50, // expiration date (https://tools.ietf.org/html/rfc7519#section-4.1.4)
      nbf: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN * 20, // token is not valid before (https://tools.ietf.org/html/rfc7519#section-4.1.5)
      jti: Math.round(Math.random() * (Number.MAX_VALUE - 1)), // Random unique identifier for this temp token. (https://tools.ietf.org/html/rfc7519#section-4.1.7)
    };
    const token = common.sign_to_token(await common.jwks_sign(private_key, payload));
    expect(token).to.be.a('string');
    const parts = token.split('.');
    let claims = parts[1];
    const signature = parts[2];
    claims = jose.util.base64url.decode(claims).toString('utf8');
    let validated = false;
    try {
      await common.jwks_verify(public_cert, 'http://localhost:5000', 'http://localhost:5000', claims, signature);
      validated = true;
    } catch (e) {
      expect(e.message).to.equal('Unauthorized: token cannot be used yet, now < "nbf" field.');
    }
    expect(validated).to.equal(false);
  });

  it('Ensure invalid issuer tokens do not work', async () => {
    const payload = {
      sub: 'username', // who made the request. (https://tools.ietf.org/html/rfc7519#section-4.1.2)
      ele: false,
      aud: 'http://localhost:5000', // who this token is intended for. (https://tools.ietf.org/html/rfc7519#section-4.1.3)
      iss: 'http://nope:5000', // who issued this token. (https://tools.ietf.org/html/rfc7519#section-4.1.1)
      exp: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN * 50, // expiration date (https://tools.ietf.org/html/rfc7519#section-4.1.4)
      nbf: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN * 20, // token is not valid before (https://tools.ietf.org/html/rfc7519#section-4.1.5)
      jti: Math.round(Math.random() * (Number.MAX_VALUE - 1)), // Random unique identifier for this temp token. (https://tools.ietf.org/html/rfc7519#section-4.1.7)
    };
    const token = common.sign_to_token(await common.jwks_sign(private_key, payload));
    expect(token).to.be.a('string');
    const parts = token.split('.');
    let claims = parts[1];
    const signature = parts[2];
    claims = jose.util.base64url.decode(claims).toString('utf8');
    let validated = false;
    try {
      await common.jwks_verify(public_cert, 'http://localhost:5000', 'http://localhost:5000', claims, signature);
      validated = true;
    } catch (e) {
      expect(e.message).to.equal('Unauthorized: issuer is invalid');
    }
    expect(validated).to.equal(false);
  });

  it('Ensure invalid audience tokens do not work', async () => {
    const payload = {
      sub: 'username', // who made the request. (https://tools.ietf.org/html/rfc7519#section-4.1.2)
      ele: false,
      aud: 'http://nope:5000', // who this token is intended for. (https://tools.ietf.org/html/rfc7519#section-4.1.3)
      iss: 'http://localhost:5000', // who issued this token. (https://tools.ietf.org/html/rfc7519#section-4.1.1)
      exp: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN * 50, // expiration date (https://tools.ietf.org/html/rfc7519#section-4.1.4)
      nbf: Math.floor((new Date()).getTime() / 1000) + TTL_TEMP_TOKEN * 20, // token is not valid before (https://tools.ietf.org/html/rfc7519#section-4.1.5)
      jti: Math.round(Math.random() * (Number.MAX_VALUE - 1)), // Random unique identifier for this temp token. (https://tools.ietf.org/html/rfc7519#section-4.1.7)
    };
    const token = common.sign_to_token(await common.jwks_sign(private_key, payload));
    expect(token).to.be.a('string');
    const parts = token.split('.');
    let claims = parts[1];
    const signature = parts[2];
    claims = jose.util.base64url.decode(claims).toString('utf8');
    let validated = false;
    try {
      await common.jwks_verify(public_cert, 'http://localhost:5000', 'http://localhost:5000', claims, signature);
      validated = true;
    } catch (e) {
      expect(e.message).to.equal('Unauthorized: audience is invalid');
    }
    expect(validated).to.equal(false);
  });

  it('Ensure token metadata cannot override core fields', async () => {
    const token = await common.create_temp_jwt_token(private_key, 'some user', 'http://localhost:5000', 'http://localhost:5000', false, {
      sub: 'other user',
      aud: 'not this one',
      iss: 'foobar',
      ele: true,
      exp: 0,
      nbf: Number.MAX_VALUE,
      app_uuid: '3d9b756c-25dc-4ce9-b01e-3e8ed21956b1',
      hook_id: '3d9b756c-25dc-4ce9-b01e-3e8ed2195555',
      hook_type: 'formation_change',
    });
    expect(token).to.be.a('string');
    const parts = token.split('.');
    let claims = parts[1];
    const signature = parts[2];
    claims = jose.util.base64url.decode(claims).toString('utf8');
    const validated_claims = await common.jwks_verify(public_cert, 'http://localhost:5000', 'http://localhost:5000', claims, signature);
    expect(validated_claims.app_uuid).to.equal('3d9b756c-25dc-4ce9-b01e-3e8ed21956b1');
    expect(validated_claims.hook_id).to.equal('3d9b756c-25dc-4ce9-b01e-3e8ed2195555');
    expect(validated_claims.hook_type).to.equal('formation_change');
    expect(validated_claims.sub).to.equal('some user');
    expect(validated_claims.ele).to.equal(false);
    expect(validated_claims.aud).to.equal('http://localhost:5000');
    expect(validated_claims.iss).to.equal('http://localhost:5000');
    expect(validated_claims.exp).to.be.a('number');
    expect(validated_claims.nbf).to.be.a('number');
  });


  it('Ensure jkws uri works.', async () => {
    const response = JSON.parse(await httph.request('get', 'http://localhost:5000/.well-known/jwks.json', {}));
    expect(response).to.be.an('object');
    expect(response.keys).to.be.an('array');
    expect(response.keys[0]).to.be.an('object');
    expect(response.keys[0].use).to.equal('sig');
    expect(response.keys[0].x5c).to.be.an('array');
    expect(response.keys[0].x5c[0]).to.be.a('string');
    expect(response.keys[0].alg).to.equal('RS256');
    expect(response.keys[0].kty).to.equal('RSA');
    expect(response.keys[0].kid).to.be.a('string');
    expect(response.keys[0].n).to.be.a('string');
    expect(response.keys[0].e).to.be.a('string');
  });
});
