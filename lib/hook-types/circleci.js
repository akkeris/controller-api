// Do not include anything from the rest of the project here
// including common.js.

const { URL } = require('url');
const https = require('./https.js');

function test(hook_url) {
  if (hook_url.toLowerCase().includes('circleci.com/api/v1.1')) {
    return true;
  }
  return false;
}

function fire(id, hook_url, type, incoming, hmac, headers = {}, token = null) {
  if (!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, ' failed as its not a valid circleci end point.');
  }
  const payload = {
    build_parameters: {
      AKKERIS_EVENT: incoming.action,
      AKKERIS_APP: `${incoming.app.name}-${incoming.space.name}`,
      AKKERIS_EVENT_PAYLOAD: JSON.stringify(incoming),
      AKKERIS_TEMP_TOKEN: token,
    },
  };
  const uri = new URL(hook_url);
  headers.authorization = Buffer.from(`${uri.password || uri.searchParams.get('access_token') || uri.searchParams.get('circle-token') || uri.searchParams.get('circle_token') || uri.searchParams.get('token') || uri.searchParams.get('key') || uri.username}:`).toString('base64');
  return https.fire(id, hook_url, type, payload, hmac, headers, token);
}

module.exports = {
  test,
  fire,
  enabled: () => (!process.env.WEBHOOK_DISABLE_CIRCLECI),
  name: 'CircleCI',
  description: 'Trigger a new CirleCI job on a release.',
  format: 'https://circleci.com/api/v1.1/project/<vcs-type>/<org>/<repo>/tree/<branch>?circle-token=<token>',
};
