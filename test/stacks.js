/* eslint-disable no-unused-expressions */
process.env.PORT = 5000;
process.env.DEFAULT_PORT = '5000';
process.env.AUTH_KEY = 'hello';
process.env.TEST_MODE = 'true';
process.env.FUBAR_REGION_API = process.env.US_SEATTLE_REGION_API;
process.env.FUGAZI_STACK_API = process.env.MARU_STACK_API || process.env.DS1_STACK_API;
const alamo_headers = {
  Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
};
const user_alamo_headers = { Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'this-is-me' };
// const http = require('http');
const { expect } = require('chai');
const init = require('./support/init.js'); // eslint-disable-line

let default_stack_name = null;

describe('stacks: list and get available stacks', function () {
  this.timeout(100000);
  const httph = require('../lib/http_helper.js');

  const validate_us_stack = function (obj) {
    expect(obj).to.be.an('object');
    expect(obj.created_at).to.be.a('string');
    expect(obj.name).to.be.a('string');
    expect(obj.region).to.be.an('object');
    expect(obj.region.id).to.be.a('string');
    expect(obj.region.name).to.be.a('string');
    expect(obj.state).to.be.a('string');
    expect(obj.updated_at).to.be.a('string');
  };

  it('covers listing all stacks', (done) => {
    httph.request('get', 'http://localhost:5000/stacks', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data[0]).to.be.an('object');
      data.forEach(validate_us_stack);
      default_stack_name = data[0].name;
      done();
    });
  });
  it('covers getting specific stack', (done) => {
    httph.request('get', `http://localhost:5000/stacks/${default_stack_name}`, alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal(default_stack_name);
      done();
    });
  });
  it('covers ensuring stacks cannot be created unless its an elevated access request', (done) => {
    httph.request('post', 'http://localhost:5000/stacks', user_alamo_headers, { name: 'should-not-happen' }, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(403);
      expect(data).to.be.null;
      done();
    });
  });
  it('covers ensuring stacks cannot be updated unless its an elevated access request', (done) => {
    httph.request(
      'patch',
      `http://localhost:5000/stacks/${default_stack_name}`,
      user_alamo_headers,
      { name: 'should-not-happen' },
      (err, data) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(403);
        expect(data).to.be.null;
        done();
      },
    );
  });

  it('covers ensuring stacks cannot be deleted unless its an elevated access request', (done) => {
    httph.request('delete', 'http://localhost:5000/stacks/us-seattle', user_alamo_headers, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(403);
      expect(data).to.be.null;
      done();
    });
  });

  it('covers requiring name on creation', (done) => {
    const payload = { region: { id: 'fugazi' }, beta: false, deprecated: false };
    httph.request('post', 'http://localhost:5000/stacks', alamo_headers, JSON.stringify(payload), (err /* data */) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(422);
      expect(err.message).to.equal('The stacks name was not provided and is required.');
      done();
    });
  });

  it('covers requiring valid name on creation', (done) => {
    const payload = { name: 'fubar!', region: { id: 'foo' } };
    httph.request('post', 'http://localhost:5000/stacks', alamo_headers, JSON.stringify(payload), (err /* data */) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(422);
      expect(err.message).to.equal('The stack name was invalid, it must be an alpha numeric and may contain a hyphen.');
      done();
    });
  });

  it('covers requiring valid region on stack creation', (done) => {
    const payload = { name: 'fugazi', beta: false, deprecated: false };
    httph.request('post', 'http://localhost:5000/stacks', alamo_headers, JSON.stringify(payload), (err /* data */) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(422);
      expect(err.message).to.equal('The specified region was not provided.');
      done();
    });
  });

  let region_id = null;
  it('covers creating a region (dependency)', (done) => {
    const payload = {
      name: 'fubar',
      description: 'description',
      country: 'country',
      locale: 'locale',
      provider: {
        name: 'provider_name',
        region: 'provider_region',
        availability_zones: ['zone1', 'zone2'],
      },
      high_availability: false,
      private_capable: false,
    };
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      region_id = data.id;
      expect(data.name).to.equal('fubar');
      done();
    });
  });

  it('covers creating a stack', (done) => {
    expect(region_id).to.be.a('string');
    const payload = { name: 'fugazi', region: { id: region_id }, state: 'beta' };
    httph.request('post', 'http://localhost:5000/stacks', alamo_headers, JSON.stringify(payload), (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('beta');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });

  it('covers not allowing duplicate names', (done) => {
    expect(region_id).to.be.a('string');
    const payload = { name: 'fugazi', region: { id: region_id }, state: 'beta' };
    httph.request('post', 'http://localhost:5000/stacks', alamo_headers, JSON.stringify(payload), (err /* data */) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(409);
      done();
    });
  });

  it('covers getting a stack', (done) => {
    httph.request('get', 'http://localhost:5000/stacks/fugazi', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('beta');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });


  it('covers not being able to create a prod space in a beta stack', (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({
      name: 'fugazi123', description: 'FFFUUUUGGGAAZZIII!!!', stack: 'fugazi', compliance: ['prod'],
    }),
    (err, data) => {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      expect(err.code).to.equal(409);
      expect(err.message).to.equal('The specified stack is not yet generally availalble, but in beta. A production space cannot be provisioned on beta systems.');
      done();
    });
  });

  it('covers not being able to create an internal space in a region not capable of private spaces', (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({
      name: 'fugazi124', description: 'FFFUUUUGGGAAZZIII!!!', stack: 'fugazi', compliance: ['internal'],
    }),
    (err, data) => {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      expect(err.code).to.equal(409);
      expect(err.message).to.equal('The specified stack and region is not capable of an private spaces.');
      done();
    });
  });

  it('covers listing stacks and finding our created stack', (done) => {
    httph.request('get', 'http://localhost:5000/stacks', alamo_headers, null, (err, resp) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      resp = JSON.parse(resp);
      let fugazi_found = false;
      for (let i = 0; i < resp.length; i++) {
        const data = resp[i];
        validate_us_stack(data);
        if (data.name === 'fugazi') {
          fugazi_found = true;
          expect(data.name).to.equal('fugazi');
          expect(data.state).to.equal('beta');
          expect(data.region.name).to.equal('fubar');
        }
      }
      expect(fugazi_found).to.equal(true);
      done();
    });
  });


  it('covers setting a stack to beta', (done) => {
    expect(region_id).to.be.a('string');
    const payload = { state: 'beta' };
    httph.request('patch', 'http://localhost:5000/stacks/fugazi', alamo_headers, JSON.stringify(payload), (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('beta');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });

  it('covers setting a stack to deprecated', (done) => {
    expect(region_id).to.be.a('string');
    const payload = { state: 'deprecated' };
    httph.request('patch', 'http://localhost:5000/stacks/fugazi', alamo_headers, JSON.stringify(payload), (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('deprecated');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });


  it('covers setting a stack to public', (done) => {
    expect(region_id).to.be.a('string');
    const payload = { state: 'public' };
    httph.request('patch', 'http://localhost:5000/stacks/fugazi', alamo_headers, JSON.stringify(payload), (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('public');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });

  it('covers setting a stack to deprecated', (done) => {
    expect(region_id).to.be.a('string');
    const payload = { state: 'deprecated' };
    httph.request('patch', 'http://localhost:5000/stacks/fugazi', alamo_headers, JSON.stringify(payload), (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('deprecated');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });

  it('covers not being able to create a space in a deprecated stack', (done) => {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({
      name: 'fugazi124', description: 'FFFUUUUGGGAAZZIII!!!', stack: 'fugazi', compliance: ['internal'],
    }),
    (err, data) => {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      expect(err.code).to.equal(409);
      expect(err.message).to.equal('The specified region or stack has been deprecated.');
      done();
    });
  });


  it('covers deleting a stack', (done) => {
    expect(region_id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/stacks/fugazi', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      validate_us_stack(data);
      expect(data.name).to.equal('fugazi');
      expect(data.state).to.equal('deprecated');
      expect(data.region.name).to.equal('fubar');
      done();
    });
  });

  it('covers deleting a region (cleanup)', (done) => {
    httph.request('delete', 'http://localhost:5000/regions/fubar', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      expect(data.name).to.equal('fubar');
      done();
    });
  });
});
