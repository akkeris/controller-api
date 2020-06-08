// Do not include anything from the rest of the project here
// including common.js.

const https = require('./https.js');

function test(hook_url) {
  if (hook_url.toLowerCase().startsWith('https://hooks.slack.com')) {
    return true;
  }
  return false;
}

function formatter(incoming) {
  // See: https://api.slack.com/docs/messages/builder?msg=%7B%22text%22%3A%22Robert%20DeSoto%20added%20a%20new%20task%22%7D
  // TODO: maybe add custom actions that can be used?...
  let payload = {
    type: 'markdwn',
    text: `\`${incoming.action}\` event fired on app \`${incoming.app.name}-${incoming.space.name}\`\n\`\`\`\n${JSON.stringify(incoming, null, 2)}\n\`\`\``,
  };
  if(incoming.action === 'released') {
    const version = incoming.release.version ? `v${incoming.release.version}` : incoming.release.id;
    const message = (incoming.slug.source_blob && incoming.slug.source_blob.message) ? `\`\`\`\n${incoming.slug.source_blob.author} - ${incoming.slug.source_blob.message}\n\`\`\`\n`: '';
    const from = (incoming.slug.source_blob && incoming.slug.source_blob.commit) ? `${incoming.slug.source_blob.repo} ${incoming.slug.source_blob.branch} \`${incoming.slug.source_blob.commit.substring(0,7)}\`` : incoming.slug.image;
    payload = {
      type: 'markdwn',
      text: `*${incoming.app.name}-${incoming.space.name}* ${incoming.dyno.type} were released! \`${version}\`\n${message}From ${from}`,
    }
  } else if(incoming.action === 'crashed') {
    const info = incoming.dynos ? `\n\`\`\`\n${incoming.dynos.map((x) => `${x.type}.${x.dyno.split('-').slice(1).join('-')}`).join('\n')}\n\`\`\`` : ''
    const subject = (incoming.dynos && incoming.dynos.length > 1) ? `dynos` : `dyno`; 
    payload = {
      type: 'markdwn',
      text: `*${incoming.app.name}-${incoming.space.name}* ${subject} crashed! \`${incoming.code} - ${incoming.description}\`${info}`,
    }
  }
  return payload;
}

function fire(id, hook_url, type, incoming, hmac, headers = {}, token = null) {
  if (!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, 'is not a valid slack endpoint');
  }
  return https.fire(id, hook_url, type, formatter(incoming), hmac, headers, token);
}

module.exports = {
  test,
  fire,
  enabled: () => (!process.env.WEBHOOK_DISABLE_SLACK),
  name: 'Slack',
  description: 'Notify a slack channel (or user) of an event.',
  format: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
  formatter,
};
