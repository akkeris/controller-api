const common = require('./common.js')
const jose = require('node-jose');

module.exports = function(keys, jwt_public_cert, audience) {
  let simple_key = function (req, provided_key) {
    if(provided_key && provided_key !== '' && provided_key !== null && (Array.isArray(keys) && keys.includes(provided_key) || typeof(keys) === 'string' && keys === provided_key)) {
      return true;
    } else {
      return false;
    }
  };

  let jwt_key = async function(req, encoded_claim) {
    if(!jwt_public_cert || jwt_public_cert.trim() === '') {
      return false;
    }
    if(!encoded_claim || !encoded_claim.toLowerCase().startsWith('bearer')) {
      return false;
    }
    encoded_claim = encoded_claim.substring(7);
    let [header, payload, signature] = encoded_claim.split('.');
    payload = jose.util.base64url.decode(payload).toString('utf8');
    try {
      let res = await common.jwks_verify(jwt_public_cert, null, audience, payload, signature);
      let claim = JSON.parse(res.payload.toString());
      if(!claim.exp || claim.exp < (new Date()).getTime()) {
        return false;
      }
      // TODO: hook id check?
      return true;
    } catch (e) {
      console.log('jwt error:', e)
      return false;
    }
  }
  return {simple_key, jwt_key};
};