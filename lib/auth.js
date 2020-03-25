const jose = require('node-jose');
const common = require('./common.js');

module.exports = function (keys, jwt_public_cert, audience) {
  const simple_key = function (req, provided_key) {
    if (
      (provided_key && provided_key !== '' && provided_key !== null)
      && ((Array.isArray(keys) && keys.includes(provided_key)) || (typeof (keys) === 'string' && keys === provided_key))
    ) {
      return true;
    }
    return false;
  };

  const jwt_key = async function (req, encoded_claim) {
    if (!jwt_public_cert || jwt_public_cert.trim() === '') {
      return false;
    }
    if (!encoded_claim || !encoded_claim.toLowerCase().startsWith('bearer')) {
      return false;
    }
    encoded_claim = encoded_claim.substring(7);
    const parts = encoded_claim.split('.');
    let [, payload] = parts;
    const [, , signature] = parts;
    if (!payload || payload === '') {
      return false;
    }
    try {
      payload = jose.util.base64url.decode(payload).toString('utf8');
      await common.jwks_verify(jwt_public_cert, null, audience, payload, signature);
      // TODO: hook id check?
      return true;
    } catch (e) {
      console.log('jwt error:', e);
      return false;
    }
  };
  return { simple_key, jwt_key };
};
