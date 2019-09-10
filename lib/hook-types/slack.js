
// Do not include anything from the rest of the project here
// including common.js.

const https = require('./https.js')

function test(hook_url) {
  if(hook_url.toLowerCase().startsWith('https://hooks.slack.com')) {
    return true
  } else {
    return false
  }
}

function fire(id, hook_url, type, incoming, hmac) {
  if(!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, 'is not a valid slack endpoint');
  }
  // See: https://api.slack.com/docs/messages/builder?msg=%7B%22text%22%3A%22Robert%20DeSoto%20added%20a%20new%20task%22%7D
  let payload = {
    "text": `${payload.action} event fired on ${payload.app.name}-${payload.space.name}`, 
  }
  return https.fire(id, hook_url, type, payload, hmac)
}

module.exports = {
  test,
  fire,
  enabled:() => process.env.WEBHOOK_DISABLE_SLACK ? false : true,
  name: "Slack",
  description: "Notify a slack channel (or user) of an event.",
  format: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
}