// Do not include anything from the rest of the project here
// including common.js.

const https = require('./https.js');

function test(hook_url) {
  if (hook_url.toLowerCase().startsWith('https://outlook.office365.com/webhook') || hook_url.toLowerCase().startsWith('https://outlook.office.com/webhook')) {
    return true;
  }
  return false;
}

function fire(id, hook_url, type, incoming, hmac, headers = {}, token = null) {
  if (!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, 'is not a valid Teams endpoint');
  }
  // See: https://docs.microsoft.com/en-us/outlook/actionable-messages/send-via-connectors
  // TODO: populate with different formatting depending on incoming message.
  // TODO: maybe add custom actions that can be used?...
  const payload = {
    '@context': 'https://schema.org/extensions',
    '@type': 'MessageCard',
    themeColor: '0072C6',
    title: `${incoming.action} event fired on ${incoming.app.name}-${incoming.space.name}`,
    text: `\`${incoming.action}\` event fired on app \`${incoming.app.name}-${incoming.space.name}\`\n\`\`\`\n${JSON.stringify(incoming, null, 2)}\n\`\`\``,
  };
  return https.fire(id, hook_url, type, payload, hmac, headers, token);
}

module.exports = {
  test,
  fire,
  enabled: () => (!process.env.WEBHOOK_DISABLE_MICROSOFT_TEAMS),
  name: 'Microsoft Teams',
  description: 'Notify a Microsoft Teams channel on an event.',
  format: 'https://outlook.office365.com/webhook/01234567-abcd-4444-abcd-1234567890ab@98765432-dddd-5555-8888-777777777777/IncomingWebhook/1234567890abcdefedcba09876544321/ffffffff-3333-4444-5555-bbbbbbbbbbbb',
};
