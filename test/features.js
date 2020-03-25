/* eslint-disable no-unused-expressions */
const init = require('./support/init.js'); // eslint-disable-line

describe('features: ensure we can set and get app features', function () {
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-username': 'test',
    'x-elevated-access': 'true',
  };
  const running_app = require('../index.js'); // eslint-disable-line
  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');

  function check_feature(obj) {
    expect(obj.name).to.a('string');
    expect(obj.id).to.be.a('string');
    expect(obj.doc_url).to.be.a('string');
    expect(obj.state).to.be.a('string');
    expect(obj.display_name).to.be.a('string');
    expect(obj.enabled).to.be.a('boolean');
  }

  it('covers listing features', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('array');
        const f = arr.filter((x) => x.name === 'auto-release');
        expect(f.length).to.equal(1);
        check_feature(f[0]);
        done();
      });
  });


  it('covers getting feature', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        done();
      });
  });


  it('covers enabling feature', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, { enabled: false },
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(false);
        done();
      });
  });

  it('covers audit events for a feature', (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app=api&space=default', alamo_headers, null,
        (err, data) => {
          if (err) {
            console.error(err);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          expect(obj.some((x) => x.action === 'feature_change')).to.eql(true);
          done();
        });
    }, 5000);
  });

  it('covers listing features (disabled)', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('array');
        const f = arr.filter((x) => x.name === 'auto-release');
        expect(f.length).to.equal(1);
        check_feature(f[0]);
        expect(f[0].enabled).to.equal(false);
        done();
      });
  });


  it('covers disabling feature again', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, { enabled: false },
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(false);
        done();
      });
  });

  it('covers getting features (enabled)', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(false);
        done();
      });
  });


  it('covers enabling feature', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, { enabled: true },
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(true);
        done();
      });
  });


  it('covers listing features (enabled)', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('array');
        const f = arr.filter((x) => x.name === 'auto-release');
        expect(f.length).to.equal(1);
        check_feature(f[0]);
        expect(f[0].enabled).to.equal(true);
        done();
      });
  });


  it('covers disabling feature again', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, { enabled: false },
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(false);
        done();
      });
  });


  it('covers getting feature (disabled)', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, null,
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(false);
        done();
      });
  });

  it('covers ensuring feature that does not exist returns 404 on patch', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/non-existant', alamo_headers, { enabled: false },
      (err, data) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(404);
        expect(data).to.be.null;
        done();
      });
  });

  it('covers enabling feature again', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/api-default/features/auto-release', alamo_headers, { enabled: true },
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const arr = JSON.parse(data);
        expect(arr).to.be.an('object');
        check_feature(arr);
        expect(arr.name).to.equal('auto-release');
        expect(arr.enabled).to.equal(true);
        done();
      });
  });

  it('covers failing to update a deprecated feature.', async () => {
    try {
      JSON.parse(await httph.request(
        'patch',
        'http://localhost:5000/apps/api-default/features/http2',
        { 'x-silent-error': true, ...alamo_headers },
        { enabled: true },
      ));
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.code).to.equal(403);
      expect(e.message).to.equal('The specified feature http2 has been deprecated');
    }
  });

  it('covers ensuring feature that does not exist returns 404 on get', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/features/non-existant', alamo_headers, null,
      (err, data) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(404);
        expect(data).to.be.null;
        done();
      });
  });
});
