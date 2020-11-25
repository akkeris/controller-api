const { expect } = require('chai');
const https = require('https');
const httph = require('../lib/http_helper.js');

describe.only('CORS filters', function () {
  this.timeout(64000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = '5000';
  process.env.TEST_MODE = 'true';
  const init = require('./support/init.js'); // eslint-disable-line

  const alamo_headers = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-silent-error': 'true',
    'x-username': 'filter-test-user',
    'x-elevated-access': 'true',
  };

  function httpsGet(url, options) {
    return new Promise((resolve, _) => {
      https.get(url, options, (res) => {
        resolve(res);
      });
    });
  }

  // Nested describe block needed for correct execution order of before/after hooks
  describe('', function () {
    let testapp;

    before(async () => {
      const filter_payload = {
        name: 'my-cors-filter',
        organization: 'test',
        type: 'cors',
        description: 'my cors filter',
        options: {
          allow_origin: ['https://allowed-origin.com'],
          allow_methods: ['get', 'post'],
          allow_headers: ['x-request-id'],
          expose_headers: ['content-type'],
          max_age: 3600,
          allow_credentials: true,
        },
      };
      const cors_filter = JSON.parse(await httph.request('post', 'http://localhost:5000/filters', alamo_headers, JSON.stringify(filter_payload)));

      testapp = await init.create_test_app_with_content('OK', 'default');

      const attachment_payload = {
        filter: { id: cors_filter.id },
        options: { excludes: ['/excluded-endpoint'] },
      };
      await httph.request('post', `http://localhost:5000/apps/${testapp.id}/filters`, alamo_headers, attachment_payload);
    });

    after(async () => {
      await init.remove_app(testapp);
      await httph.request('delete', 'http://localhost:5000/filters/my-cors-filter', alamo_headers, null);
    });

    it('request from allowed origin', async function () {
      this.retries(4);
      if (this.test._currentRetry > 0) await init.wait(1000);

      const options = { headers: { Origin: 'https://allowed-origin.com' } };
      const res = await httpsGet(testapp.web_url, options);
      expect(res.headers).to.have.property('access-control-allow-origin');
    });
  });
});
