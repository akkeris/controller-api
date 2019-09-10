
// Do not include anything from the rest of the project here
// including common.js.

function test(hook_url) {
  if(hook_url.toLowerCase().startsWith('mailto:')) {
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
  enabled:() => false, //process.env.WEBHOOK_EMAIL_FROM && process.env.WEBHOOK_EMAIL_SMTP,
  name: "Email",
  description: "Receive an email on an event."
}