
// Do not include anything from the rest of the project here
// including common.js.

function test(hook_url) {
  if(hook_url.toLowerCase().startsWith('sms:')) {
    return true
  } else {
    return false
  }
}

function fire(id, hook_url, type, payload, hmac, headers = {}) {
  return new Promise((res, rej) => {
    return rej(new Error('unfinished'))
    // TODO, we need to add a way to opt out and track destination calls as to not flood or DDoS users.
  })
}

module.exports = {
  test,
  fire,
  enabled:() => false, //process.env.WEBHOOK_TWILIO_TELEPHONE && process.env.WEBHOOK_TWILIO_AUTH_KEY,
  name: "Text Message",
  description: "Receive a text message (SMS) on an event.",
  format: "sms:3334449999"
}