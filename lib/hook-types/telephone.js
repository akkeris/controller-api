
// Do not include anything from the rest of the project here
// including common.js.

function test(hook_url) {
  if(hook_url.toLowerCase().startsWith('tel:')) {
    return true
  } else {
    return false
  }
}

function fire(id, hook_url, type, incoming, hmac, headers = {}) {
  return new Promise((res, rej) => {
    return rej(new Error('unfinished'))
    // new URL(`https://api.twilio.com/2010-04-01/Accounts/${process.env.WEBHOOK_TWILIO_SID}/Calls.json`);
    // TODO, we need to add a way to opt out and track destination calls as to not flood or DDoS users.
  });
}

module.exports = {
  test,
  fire,
  enabled:() => false, //process.env.WEBHOOK_TWILIO_TELEPHONE && process.env.WEBHOOK_TWILIO_SID && process.env.WEBHOOK_TWILIO_AUTH_KEY,
  name: "Telephone",
  description: "Receive a phone call on an event.",
  format: "tel:3334449999"
}