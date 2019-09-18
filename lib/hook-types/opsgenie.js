
// Do not include anything from the rest of the project here
// including common.js.

const https = require('./https.js');
const URL = require('url').URL;

function test(hook_url) {
  if(hook_url.toLowerCase().includes('api.opsgenie.com') || hook_url.toLowerCase().includes('api.eu.opsgenie.com')) {
    return true;
  } else {
    return false;
  }
}

function to_string_map(input) {
  let out = {};
  Object.keys(input).forEach((x) => {
    out[x] = JSON.stringify(input[x], null, 2);
  })
  return out;
}

function fire(id, hook_url, type, incoming, hmac, headers = {}) {
  if(!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, 'is not a valid opsgenie');
  }
  let payload = {
    source: `${incoming.app.name}-${incoming.space.name}`,
    message: `${incoming.action} event fired on ${incoming.app.name}-${incoming.space.name}`, 
    details: to_string_map(incoming),
  };
  let uri = new URL(hook_url);
  headers['authorization'] = 'GenieKey ' + (uri.password || uri.searchParams.get('access_token') || uri.searchParams.get('token') || uri.searchParams.get('key') || uri.username);
  return https.fire(id, hook_url, type, payload, hmac, headers);
}

module.exports = {
  test,
  fire,
  enabled:() => process.env.WEBHOOK_DISABLE_OPSGENIE ? false : true,
  name: "OpsGenie",
  description: "Send an opsgenie alert on an event.",
  format: "https://token@api.opsgenie.com/v2/alerts"
};