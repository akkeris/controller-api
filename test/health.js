/* eslint-disable no-unused-expressions */
describe('health checks n such.', function () {
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {
    Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
  };
  const running_app = require('../index.js'); // eslint-disable-line
  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');

  it('covers health check', (done) => {
    httph.request('get', 'http://localhost:5000/octhc', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        expect(data).to.equal('overall_status=good');
        done();
      });
  });
});
