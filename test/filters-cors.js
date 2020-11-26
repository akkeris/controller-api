const { expect } = require('chai');
const https = require('https');
const httph = require('../lib/http_helper.js');

describe('CORS filters', function () {
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

  function httpsRequest(url, options) {
    return new Promise((resolve) => {
      const req = https.request(url, options, (res) => {
        resolve(res);
      });
      req.end();
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

    describe('when sending a simple request', function () {
      describe('from the same origin', function () {
        it('returns no access-control headers', async function () {
          await init.wait(1000); // Give Istio a second to apply the filter

          const options = { method: 'GET', headers: { Origin: testapp.web_url } };
          const response = await httpsRequest(testapp.web_url, options);

          expect(response.headers).to.not.have.any.keys('access-control-allow-origin', 'access-control-allow-credentials', 'access-control-expose-headers');
        });
      });

      describe('from a disallowed origin', function () {
        it('returns no access-control headers', async function () {
          await init.wait(1000); // Give Istio a second to apply the filter

          const options = { method: 'GET', headers: { Origin: 'https://disallowed-origin.com' } };
          const response = await httpsRequest(testapp.web_url, options);

          expect(response.headers).to.not.have.any.keys('access-control-allow-origin', 'access-control-allow-credentials', 'access-control-expose-headers');
        });
      });

      describe('from an allowed origin', function () {
        it('returns expected access-control headers', async function () {
          this.retries(4);
          if (this.test._currentRetry > 0) { await init.wait(1000); }

          const options = { method: 'GET', headers: { Origin: 'https://allowed-origin.com' } };
          const response = await httpsRequest(testapp.web_url, options);

          expect(response.headers).to.include({
            'access-control-allow-origin': 'https://allowed-origin.com',
            'access-control-allow-credentials': 'true',
            'access-control-expose-headers': 'content-type',
          });
        });
      });

      describe('when sending a preflight request', function () {
        describe('from the same origin', function () {
          it('returns expected access-control headers', async function () {
            await init.wait(1000); // Give Istio a second to apply the filter

            const options = {
              method: 'OPTIONS',
              headers: {
                Origin: 'https://disallowed-origin.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'X-PINGOTHER, Content-Type',
              },
            };
            const response = await httpsRequest(testapp.web_url, options);

            expect(response.headers).to.not.have.any.keys('access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-max-age');
          });
        });

        describe('from a disallowed origin', function () {
          it('returns expected access-control headers', async function () {
            await init.wait(1000); // Give Istio a second to apply the filter

            const options = {
              method: 'OPTIONS',
              headers: {
                Origin: 'https://disallowed-origin.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'X-PINGOTHER, Content-Type',
              },
            };
            const response = await httpsRequest(testapp.web_url, options);

            expect(response.headers).to.not.have.any.keys('access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-max-age');
          });
        });

        describe('from an allowed origin', function () {
          it('returns expected access-control headers', async function () {
            this.retries(4);
            if (this.test._currentRetry > 0) { await init.wait(1000); }

            const options = {
              method: 'OPTIONS',
              headers: {
                Origin: 'https://allowed-origin.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'X-PINGOTHER, Content-Type',
              },
            };
            const response = await httpsRequest(testapp.web_url, options);

            expect(response.headers).to.include({
              'access-control-allow-origin': 'https://allowed-origin.com',
              'access-control-allow-credentials': 'true',
              'access-control-allow-methods': 'GET,POST',
              'access-control-allow-headers': 'x-request-id',
              'access-control-max-age': '3600',
            });
          });
        });
      });
    });
  });
});
