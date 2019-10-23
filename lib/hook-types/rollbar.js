
// Do not include anything from the rest of the project here
// including common.js.

const https = require('./https.js');
const URL = require('url').URL;

function test(hook_url) {
  if(hook_url.toLowerCase().includes('api.rollbar.com/api/1/deploy')) {
    return true;
  } else {
    return false;
  }
}

function fire(id, hook_url, type, incoming, hmac, headers = {}, token = null) {
  if(!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, 'as http or https');
  }
  // See: https://docs.rollbar.com/reference
  let payload = {
    environment: `${incoming.app.name}-${incoming.space.name}`,
    revision: incoming.build ? incoming.build.commit : "",
    comment: incoming.release ? incoming.release.description : "",
  };
  if (incoming.release) {
    if (incoming.release.result === "succeeded") {
      payload.status = "succeeded";
    } else if (incoming.release.result === "failed") {
      payload.status = "failed";
    } else {
      payload.status = "started";
    }
  } else {
    payload.status = "started"
  }
  let uri = new URL(hook_url);
  payload.access_token = (uri.password || uri.searchParams.get('access_token') || uri.searchParams.get('token') || uri.searchParams.get('key') || uri.username);
  return https.fire(id, hook_url, type, payload, hmac, headers, token);
}

module.exports = {
  test,
  fire,
  enabled:() => process.env.WEBHOOK_DISABLE_ROLLBAR ? false : true,
  name: "Rollbar",
  description: "Notify rollbar of a new deployment.",
  format: "https://api.rollbar.com/api/1/deploy"
};