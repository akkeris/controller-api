// Do not include anything from the rest of the project here
// including common.js.

const url = require('url');
const https = require('./https.js');

const ALLOWED_SEVERITY = ['critical', 'warning', 'error', 'info'];

// PagerDuty API: https://developer.pagerduty.com/api-reference/b3A6Mjc0ODI2Nw-send-an-event-to-pager-duty

// /v2/enqueue - Send Event
// /v2/change/enqueue - Send Change Event
// Integration key should be and severity level can be provided after the endpoint
// Severity level should be one of 'critical, warning, error, info'
//   e.g. https://events.pagerduty.com/v2/enqueue?key=737ea619db564d41bd9824063e1f6b08&severity=warning

function test(hook_url) {
  if (
    hook_url.toLowerCase().startsWith('https://events.pagerduty.com/v2/enqueue?')
    || hook_url.toLowerCase().startsWith('https://events.pagerduty.com/v2/change/enqueue?')
  ) {
    try {
      return (new URL(hook_url)).searchParams.has('integration_key'); // Needs to at least include the integration key for this to work
    } catch (err) {
      return false;
    }
  }
  return false;
}

function to_string_map(input) {
  const out = {};
  Object.keys(input).forEach((x) => {
    out[x] = JSON.stringify(input[x], null, 2);
  });
  return out;
}

function clean_forward_slash(uri) {
  if (!uri) {
    return uri;
  }
  if (uri[uri.length - 1] === '/') {
    uri = uri.substring(0, uri.length - 1);
  }
  if (!uri.startsWith('http')) {
    uri = `https://${uri}`;
  }
  return uri;
}

function fire(id, hook_url, type, incoming, hmac, headers = {}, token = null) {
  if (!test(hook_url)) {
    throw new Error('unable to fire webhook:', hook_url, 'is not a valid PagerDuty endpoint');
  }

  const fire_type = hook_url.toLowerCase().includes('change/enqueue') ? 'change' : 'event';
  const search_params = (new url.URL(hook_url.toLowerCase())).searchParams;
  const severity = (
    search_params.has('severity')
    && ALLOWED_SEVERITY.includes(search_params.get('severity').toLowerCase())
  ) ? search_params.get('severity').toLowerCase() : 'critical';

  const payload = {
    payload: {
      // Summary of event, used to generate summaries and titles of alerts
      summary: `${incoming.action} event fired on ${incoming.app.name}-${incoming.space.name}`,
      // Unique location of the affected system, preferably a hostname or FQDN
      source: `${incoming.app.name}-${incoming.space.name}`,
      // Additional details about the event and affected system
      custom_details: to_string_map(incoming),
    },
    routing_key: search_params.get('integration_key'),
  };

  if (fire_type === 'event') {
    payload.event_action = 'trigger';
    payload.client = 'Akkeris';
    payload.client_url = clean_forward_slash(process.env.AKKERIS_UI_URL);
    payload.payload.severity = severity;
  }

  return https.fire(id, hook_url, type, payload, hmac, headers, token);
}

module.exports = {
  test,
  fire,
  enabled: () => (!process.env.WEBHOOK_DISABLE_PAGERDUTY),
  name: 'PagerDuty',
  description: 'Send a PagerDuty alert on an event.',
  format: 'https://events.pagerduty.com/v2/(enqueue|change/enqueue)?integration_key=<key>&severity=<severity>',
};
