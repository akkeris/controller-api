
describe('filters: ensure filters can be created and applied.', function () {
  this.timeout(30000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = '5000';
  process.env.TEST_MODE = 'true';
  const { expect } = require('chai');
  const init = require('./support/init.js'); // eslint-disable-line
  const httph = require('../lib/http_helper.js');
  const alamo_headers = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-silent-error': 'true',
    'x-username': 'filter-test-user',
    'x-elevated-access': 'true',
  };

  let testapp = null;
  let testapp_filter = null;
  let testapp_filter2 = null;
  let testapp_filter3 = null;
  let testapp_filter_attachment = null;
  let testapp_filter_attachment2 = null;

  it('create: check for required field when creating a filter', async () => {
    testapp = await init.create_test_app('default');
    let payload = {
      name: 'test-filter-name',
    };
    try {
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.description = 'foo';
    try {
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.type = 'foo';
    try {
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.type = 'jwt';
    try {
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.options = {};
    payload.options.jwks_uri = 'https://foobar.com';
    try {
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.options.issuer = 'fooissuer';
    try {
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }
    payload.organization = 'test';
    const response = JSON.parse(await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload));
    expect(response.name).to.equal('test-filter-name');
    expect(response.description).to.equal('foo');
    expect(response.type).to.equal('jwt');
    expect(response.options.jwks_uri).to.equal('https://foobar.com');
    expect(response.options.issuer).to.equal('fooissuer');
    expect(response.created_at).to.be.a('string');
    expect(response.updated_at).to.be.a('string');
    expect(response.organization).to.be.an('object');
    expect(response.organization.id).to.be.a('string');
    expect(response.id).to.be.a('string');

    payload.name = 'test-filter-name2';
    testapp_filter2 = JSON.parse(await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload));
    expect(testapp_filter2.name).to.equal('test-filter-name2');
    expect(testapp_filter2.description).to.equal('foo');
    expect(testapp_filter2.type).to.equal('jwt');
    expect(testapp_filter2.options.jwks_uri).to.equal('https://foobar.com');
    expect(testapp_filter2.options.issuer).to.equal('fooissuer');
    expect(testapp_filter2.created_at).to.be.a('string');
    expect(testapp_filter2.updated_at).to.be.a('string');
    expect(testapp_filter2.organization).to.be.an('object');
    expect(testapp_filter2.organization.id).to.be.a('string');
    expect(testapp_filter2.id).to.be.a('string');

    payload = {
      name: 'test-filter-name3',
      organization: 'test',
      type: 'cors',
      description: 'my cors filter',
      options: {
        allow_origin: ['*'],
        allow_methods: ['get', 'post'],
        allow_headers: ['x-request-id'],
        expose_headers: ['content-type'],
        max_age: 3600,
        allow_credentials: true,
      },
    };
    testapp_filter3 = JSON.parse(await httph.request('post', 'http://localhost:5000/filters', alamo_headers, JSON.stringify(payload)));
    expect(testapp_filter3.name).to.equal('test-filter-name3');
    expect(testapp_filter3.description).to.equal('my cors filter');
    expect(testapp_filter3.type).to.equal('cors');
    expect(testapp_filter3.options.allow_origin).to.be.an('array');
    expect(testapp_filter3.options.allow_origin[0]).to.equal('*');
    expect(testapp_filter3.options.allow_methods).to.be.an('array');
    expect(testapp_filter3.options.allow_methods[0]).to.equal('GET');
    expect(testapp_filter3.options.allow_methods[1]).to.equal('POST');
    expect(testapp_filter3.options.allow_headers).to.be.an('array');
    expect(testapp_filter3.options.allow_headers[0]).to.equal('x-request-id');
    expect(testapp_filter3.options.expose_headers).to.be.an('array');
    expect(testapp_filter3.options.expose_headers[0]).to.equal('content-type');
    expect(testapp_filter3.options.max_age).to.equal(3600);
    expect(testapp_filter3.options.allow_credentials).to.equal(true);
    expect(testapp_filter3.created_at).to.be.a('string');
    expect(testapp_filter3.updated_at).to.be.a('string');
    expect(testapp_filter3.organization).to.be.an('object');
    expect(testapp_filter3.organization.id).to.be.a('string');
    expect(testapp_filter3.id).to.be.a('string');
  });

  it('ensure invalid values are not allowed in cors filters', async () => {
    try {
      const payload = {
        name: 'test-filter-name4',
        organization: 'test',
        type: 'cors',
        description: 'my cors filter',
        options: {
          allow_origin: ['^%$#@'],
          allow_methods: ['get', 'post'],
          allow_headers: ['x-requ  est-id'],
          expose_headers: ['content-type'],
          max_age: 3600,
          allow_credentials: true,
        },
      };
      await httph.request('post', 'http://localhost:5000/filters', alamo_headers, payload);
    } catch (e) {
      // do nothing
    }
  });

  it('list filters', async () => {
    const filters = JSON.parse(await httph.request('get', 'http://localhost:5000/filters', alamo_headers, null));

    let filter = null;
    filters.forEach((x) => {
      if (x.name === 'test-filter-name') {
        filter = x;
      }
    });
    expect(filter).to.be.an('object');
    expect(filter.name).to.equal('test-filter-name');
    expect(filter.description).to.equal('foo');
    expect(filter.type).to.equal('jwt');
    expect(filter.options.jwks_uri).to.equal('https://foobar.com');
    expect(filter.options.issuer).to.equal('fooissuer');
    expect(filter.created_at).to.be.a('string');
    expect(filter.updated_at).to.be.a('string');
    expect(filter.organization).to.be.an('object');
    expect(filter.organization.id).to.be.a('string');
    expect(filter.id).to.be.a('string');
  });

  it('get a filter', async () => {
    const filter = JSON.parse(await httph.request('get', 'http://localhost:5000/filters/test-filter-name', alamo_headers, null));
    expect(filter).to.be.an('object');
    expect(filter.name).to.equal('test-filter-name');
    expect(filter.description).to.equal('foo');
    expect(filter.type).to.equal('jwt');
    expect(filter.options.jwks_uri).to.equal('https://foobar.com');
    expect(filter.options.issuer).to.equal('fooissuer');
    expect(filter.created_at).to.be.a('string');
    expect(filter.updated_at).to.be.a('string');
    expect(filter.organization).to.be.an('object');
    expect(filter.organization.id).to.be.a('string');
    expect(filter.id).to.be.a('string');
  });

  it('update a filter', async () => {
    const payload = {};

    // ensure we can update a filter without a description, type, or name.
    payload.options = {};
    payload.options.jwks_uri = 'https://foobar2.com';
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }
    delete payload.options;

    payload.name = 'test-filter-name';
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }
    payload.description = 'second desc';
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }
    payload.type = 'foo';
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }
    payload.type = 'jwt';
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.options = {};
    payload.options.jwks_uri = 'https://foobar2.com';
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      // do nothing
    }

    payload.options.issuer = 'fooissuer2';
    testapp_filter = JSON.parse(await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload));
    expect(testapp_filter).to.be.an('object');
    expect(testapp_filter.name).to.equal('test-filter-name');
    expect(testapp_filter.description).to.equal('second desc');
    expect(testapp_filter.type).to.equal('jwt');
    expect(testapp_filter.options.jwks_uri).to.equal('https://foobar2.com');
    expect(testapp_filter.options.issuer).to.equal('fooissuer2');
    expect(testapp_filter.created_at).to.be.a('string');
    expect(testapp_filter.updated_at).to.be.a('string');
    expect(testapp_filter.organization).to.be.an('object');
    expect(testapp_filter.organization.id).to.be.a('string');
    expect(testapp_filter.id).to.be.a('string');
  });


  it('create filter attachment on an app', async () => {
    expect(testapp_filter).to.be.an('object');
    const payload = {
      filter: {
        id: testapp_filter.id,
      },
      options: {
        excludes: ['/foobar'],
      },
    };
    testapp_filter_attachment = JSON.parse(await httph.request(
      'post',
      `http://localhost:5000/apps/${testapp.id}/filters`,
      alamo_headers,
      payload,
    ));
    expect(testapp_filter_attachment).to.be.an('object');
    expect(testapp_filter_attachment.id).to.be.a('string');
    expect(testapp_filter_attachment.options).to.be.an('object');
    expect(testapp_filter_attachment.options.excludes).to.be.an('array');
    expect(testapp_filter_attachment.options.excludes[0]).to.equal('/foobar');
    expect(testapp_filter_attachment.filter.id).to.equal(testapp_filter.id);
    expect(testapp_filter_attachment.created_at).to.be.a('string');
    expect(testapp_filter_attachment.updated_at).to.be.a('string');
  });


  it('test duplicate filter type attachments is not allowed', async () => {
    expect(testapp_filter).to.be.an('object');
    const payload = {
      filter: {
        id: testapp_filter2.id,
      },
      options: {
        excludes: ['/foobar3'],
      },
    };
    try {
      await httph.request('post', `http://localhost:5000/apps/${testapp.id}/filters`, alamo_headers, payload);
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.code).to.equal(400);
      expect(e.message).to.equal('A filter of type jwt is already attached to this app.');
    }
  });

  it('create filter attachment on an app, test multiple types of filters', async () => {
    expect(testapp_filter).to.be.an('object');
    const payload = {
      filter: {
        id: testapp_filter3.id,
      },
      options: {},
    };
    testapp_filter_attachment2 = JSON.parse(await httph.request(
      'post',
      `http://localhost:5000/apps/${testapp.id}/filters`,
      alamo_headers,
      payload,
    ));
    expect(testapp_filter_attachment2).to.be.an('object');
    expect(testapp_filter_attachment2.id).to.be.a('string');
    expect(testapp_filter_attachment2.options).to.be.an('object');
    expect(testapp_filter_attachment2.filter.id).to.equal(testapp_filter3.id);
    expect(testapp_filter_attachment2.created_at).to.be.a('string');
    expect(testapp_filter_attachment2.updated_at).to.be.a('string');
  });

  it('list filter attachments on an app', async () => {
    expect(testapp_filter).to.be.an('object');
    const fa = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${testapp.id}/filters`, alamo_headers, null));
    expect(fa.length).to.equal(2);
    expect(fa[0]).to.be.an('object');
    expect(fa[0].filter.id).to.be.a('string');
    expect(fa[0].created_at).to.be.a('string');
    expect(fa[0].updated_at).to.be.a('string');
  });

  it('update filter attachment on an app', async () => {
    expect(testapp_filter).to.be.an('object');
    const payload = {
      filter: {
        id: testapp_filter.id,
      },
      options: {
        excludes: ['/foobar2'],
      },
    };
    testapp_filter_attachment = JSON.parse(await httph.request(
      'put',
      `http://localhost:5000/apps/${testapp.id}/filters/${testapp_filter_attachment.id}`,
      alamo_headers,
      payload,
    ));
    expect(testapp_filter_attachment).to.be.an('object');
    expect(testapp_filter_attachment.options).to.be.an('object');
    expect(testapp_filter_attachment.options.excludes).to.be.an('array');
    expect(testapp_filter_attachment.options.excludes[0]).to.equal('/foobar2');
    expect(testapp_filter_attachment.filter.id).to.equal(testapp_filter.id);
    expect(testapp_filter_attachment.created_at).to.be.a('string');
    expect(testapp_filter_attachment.updated_at).to.be.a('string');
  });

  it('get filter attachments on an app', async () => {
    expect(testapp_filter).to.be.an('object');
    expect(testapp_filter_attachment).to.be.an('object');
    const fa = JSON.parse(await httph.request(
      'get',
      `http://localhost:5000/apps/${testapp.id}/filters/${testapp_filter_attachment.id}`,
      alamo_headers,
      null,
    ));
    expect(fa).to.be.an('object');
    expect(fa.options).to.be.an('object');
    expect(fa.options.excludes).to.be.an('array');
    expect(fa.options.excludes[0]).to.equal('/foobar2');
    expect(fa.filter.id).to.equal(testapp_filter.id);
    expect(fa.created_at).to.be.a('string');
    expect(fa.updated_at).to.be.a('string');
  });

  it('delete filter attachments on an app', async () => {
    expect(testapp_filter).to.be.an('object');
    expect(testapp_filter_attachment).to.be.an('object');
    await httph.request(
      'delete',
      `http://localhost:5000/apps/${testapp.id}/filters/${testapp_filter_attachment.id}`,
      alamo_headers,
      null,
    );
    let fa = JSON.parse(await httph.request(
      'get',
      `http://localhost:5000/apps/${testapp.id}/filters`,
      alamo_headers,
      null,
    ));
    expect(fa.length).to.equal(1);
    await httph.request(
      'delete',
      `http://localhost:5000/apps/${testapp.id}/filters/${testapp_filter_attachment2.id}`,
      alamo_headers,
      null,
    );
    fa = JSON.parse(await httph.request(
      'get',
      `http://localhost:5000/apps/${testapp.id}/filters`,
      alamo_headers,
      null,
    ));
    expect(fa.length).to.equal(0);
  });

  it('delete: ensure a filter can be removed', async () => {
    await httph.request('delete', 'http://localhost:5000/filters/test-filter-name', alamo_headers, null);
    await httph.request('delete', 'http://localhost:5000/filters/test-filter-name2', alamo_headers, null);
    await httph.request('delete', 'http://localhost:5000/filters/test-filter-name3', alamo_headers, null);
  });

  it('delete: clean up after ourselves', async () => {
    await init.remove_app(testapp);
  });
});
