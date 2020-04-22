/* eslint-disable no-unused-expressions */
const init = require('./support/init.js'); // eslint-disable-line
describe('certificates: ensure we can pull and list certificates and orders', function () {
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.TEST_MODE = 'true'; // prevents creating actual spaces.  Since we cant delete them, we bail out before committing.
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-username': 'testuser@abcd.com',
    'x-elevated-access': 'true',
  };
  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');
  function validate_certificate(obj) {
    expect(obj.created_at).to.be.a('string');
    expect(obj.id).to.be.a('string');
    expect(obj.name).to.be.a('string');
    expect(obj.comments).to.be.a('string');
    expect(obj.requester).to.be.a('object');
    expect(obj.requester.name).to.be.a('string');
    expect(obj.organization).to.be.a('object');
    expect(obj.organization.id).to.be.a('string');
    expect(obj.organization.name).to.be.a('string');
    expect(obj.region).to.be.a('object');
    expect(obj.region.id).to.be.a('string');
    expect(obj.region.name).to.be.a('string');
    expect(obj.request).to.be.a('string');
    expect(obj.common_name).to.be.a('string');
    expect(obj.domain_names).to.be.an('array');
    expect(obj.installed).to.be.a('boolean');
    expect(obj.status).to.be.a('string');
    expect(obj.updated_at).to.be.a('string');
    expect(obj.type).to.be.a('string');
  }

  it('covers listing ssl orders', (done) => {
    httph.request('get', 'http://localhost:5000/ssl-orders', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach(validate_certificate);
        done();
      });
  });
  it('covers not allowing names that are not alpha numeric', (done) => {
    httph.request('post', 'http://localhost:5000/ssl-orders', alamo_headers,
      JSON.stringify({ name: 'this is not valid.!' }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
      });
  });
  it('covers not allowing domain names that are not valid', (done) => {
    httph.request('post', 'http://localhost:5000/ssl-orders', alamo_headers,
      JSON.stringify({ name: 'fugazi', common_name: 'www.no t a domain.com' }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        done();
      });
  });
  it('covers ensuring domain names contains common name.', (done) => {
    httph.request('post', 'http://localhost:5000/ssl-orders',
      { 'x-username': 'testuser@abcd.com', ...alamo_headers },
      JSON.stringify({
        name: 'fugazi',
        common_name: 'fugazi.abcd.io',
        domain_names: [],
        comments: 'This is a test, if you find it, reject it.',
        org: 'test',
      }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(422);
        expect(data).to.be.null;
        done();
      });
  });
  const short_name = `fugazi${Math.round(Math.random() * 10000000)}`;
  it('partially covers creating certificates', (done) => {
    httph.request('post', 'http://localhost:5000/ssl-orders',
      { 'x-username': 'testuser@abcd.com', ...alamo_headers },
      JSON.stringify({
        name: short_name,
        common_name: 'fugazi.abcd.io',
        domain_names: ['fugazi.abcd.io'],
        comments: 'This is a test, if you find it, reject it.',
        org: 'test',
      }),
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        validate_certificate(obj);
        expect(obj.name).to.equal(short_name);
        expect(obj.common_name).to.equal('fugazi.abcd.io');
        expect(obj.domain_names.length).to.equal(1);
        expect(obj.domain_names[0]).to.equal('fugazi.abcd.io');
        expect(obj.comments).to.equal('This is a test, if you find it, reject it.');
        expect(obj.requester.name).to.equal('testuser@abcd.com');
        expect(obj.installed).to.equal(false);
        expect(obj.status).to.equal('pending');
        expect(obj.expires).to.be.null;
        expect(obj.issued).to.be.null;
        expect(obj.organization.id).to.equal('0b26ccb5-83cc-4d33-a01f-100c383e0065');
        expect(obj.organization.name).to.equal('test');
        // expect(obj.region.name).to.equal(default_stack_name)
        expect(obj.region.id).to.equal('f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3');
        expect(obj.type).to.equal('ssl_plus');
        done();
      });
  });
  it('does not allow duplicate certificate creation', (done) => {
    httph.request('post', 'http://localhost:5000/ssl-orders',
      { 'x-username': 'testuser@abcd.com', ...alamo_headers },
      JSON.stringify({
        name: short_name,
        common_name: 'fugazi.abcd.io',
        domain_names: ['fugazi.abcd.io'],
        comments: 'This is a test, if you find it, reject it.',
        org: 'test',
      }),
      (err /* data */) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(422);
        done();
      });
  });
  it('covers getting info on ssl orders', (done) => {
    httph.request('get', `http://localhost:5000/ssl-orders/${short_name}`, alamo_headers, null,
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        validate_certificate(obj);
        done();
      });
  });
  it('covers being unable to install a ssl orders', (done) => {
    httph.request('put', `http://localhost:5000/ssl-orders/${short_name}`, alamo_headers, null,
      (err /* data */) => {
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The specified certificate has not yet been approved and issued.');
        done();
      });
  });

  it('covers getting info on ssl orders (and cause it to be approved)', (done) => {
    process.env.TEST_MODE_APPROVE_CERT = 'true';
    httph.request('get', `http://localhost:5000/ssl-orders/${short_name}`, alamo_headers, null,
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        validate_certificate(obj);
        expect(obj.status).to.equal('issued');
        done();
      });
  });

  it('covers partially installing a ssl orders', (done) => {
    process.env.TEST_MODE_APPROVE_CERT = 'true';
    httph.request('put', `http://localhost:5000/ssl-orders/${short_name}`, alamo_headers, null,
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        validate_certificate(obj);
        expect(obj.installed).to.equal(true);
        done();
      });
  });

  it('covers ensuring the list of ssl orders does not contain cert since its installed.', (done) => {
    httph.request('get', 'http://localhost:5000/ssl-orders', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach(validate_certificate);
        expect(obj.filter((d) => d.name === short_name).length).to.equal(0);
        done();
      });
  });

  it('covers ensuring the list of ssl endpoints now contains this..', (done) => {
    httph.request('get', 'http://localhost:5000/ssl-endpoints', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach(validate_certificate);
        expect(obj.filter((d) => d.name === short_name).length).to.equal(1);
        done();
      });
  });
});
