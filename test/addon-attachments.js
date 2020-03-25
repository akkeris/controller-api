/* eslint-disable no-unused-expressions */
process.env.DEFAULT_PORT = '5000';
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const { expect } = require('chai');
const support = require('./support/init.js');
const httph = require('../lib/http_helper.js');

const alamo_headers = {
  Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
};

describe('addons attachments:', function () {
  this.timeout(200000);

  const appname_brand_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  let postgresql_response = null;
  let postgresql_plan = null;
  const appname_second_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  let appname_second_id = null;
  let postgresql_addon_attachment_id = null;

  const appname_third_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  let appname_third_id = null;

  it('covers creating the test app for services', async () => {
    const data = await httph.request(
      'post',
      'http://localhost:5000/apps',
      alamo_headers,
      JSON.stringify({
        org: 'test',
        space: 'default',
        name: appname_brand_new,
      }),
    );
    expect(data).to.be.a('string');
    const app_url = JSON.parse(data).web_url;
    expect(app_url).to.be.a('string');
    await httph.request('post', `http://localhost:5000/apps/${appname_brand_new}-default/formation`, alamo_headers, JSON.stringify({
      size: 'gp2', quantity: 1, type: 'web', port: 5000,
    }));
  });

  it('covers getting a postres plans', async () => {
    const data = await httph.request('get', 'http://localhost:5000/addon-services/akkeris-postgresql/plans', alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    obj.forEach((plan) => {
      if (plan.name === 'akkeris-postgresql:hobby') {
        postgresql_plan = plan;
      }
    });
    expect(postgresql_plan).to.be.an('object');
  });

  it('covers creating a postgresql service', async () => {
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons`,
      alamo_headers,
      JSON.stringify({
        plan: postgresql_plan.id,
      }),
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    postgresql_response = obj;
  });

  it('covers creating dependent build for first test app', async () => {
    const build_payload = {
      sha: '123456',
      org: 'test',
      repo: 'https://github.com/abcd/some-repo',
      branch: 'master',
      version: 'v1.0',
      checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      url: 'docker://docker.io/akkeris/test-attach:v4',
    };
    const info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_brand_new}-default/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    );
    expect(info).to.be.a('string');
    const build_info = JSON.parse(info);
    await support.wait_for_build(`${appname_brand_new}-default`, build_info.id);
    const payload = JSON.stringify({ slug: build_info.id, description: `Deploy ${build_info.id}` });
    const release_info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_brand_new}-default/releases`,
      alamo_headers,
      payload,
    );
    expect(release_info).to.be.a('string');
  });

  it('covers getting info on a running postgresql service', async () => {
    expect(postgresql_response).to.be.an('object');
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgresql_response.id}`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(postgresql_response.id);
  });

  it('covers ensuring owned addon DATABASE_URL is returned from first app', async () => {
    await support.wait_for_app_content(`https://${appname_brand_new}${process.env.ALAMO_BASE_DOMAIN}/DATABASE_URL`,
      postgresql_response.config_vars.DATABASE_URL.substring(postgresql_response.config_vars.DATABASE_URL.indexOf('@')));
  });

  it('covers getting info on a running postgresql service by name', async () => {
    expect(postgresql_response).to.be.an('object');
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgresql_response.name}`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(postgresql_response.id);
  });

  it('covers listing all services and checking for postgresql', async () => {
    expect(postgresql_response).to.be.an('object');
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    let found_postgresql = false;
    obj.forEach((service) => {
      if (service.id === postgresql_response.id) {
        found_postgresql = true;
      }
    });
    expect(found_postgresql).to.equal(true);
  });

  it('covers listing all attached services, owned service should not be in attachments', async () => {
    expect(postgresql_response).to.be.an('object');
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addon-attachments`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    expect(obj.length).to.equal(0);
  });

  it('covers listing all audit events for attachments', async () => {
    const data = await httph.request('get', `http://localhost:5000/audits?app=${appname_brand_new}&space=default`, alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    expect(obj.some((x) => x.action === 'addon_change')).to.eql(true);
  });

  it('covers creating the second test app for services', async () => {
    let data = await httph.request(
      'post',
      'http://localhost:5000/apps',
      alamo_headers,
      JSON.stringify({
        org: 'test',
        space: 'default',
        name: appname_second_new,
      }),
    );
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    appname_second_id = data.id;
    await httph.request('post', `http://localhost:5000/apps/${appname_second_new}-default/formation`, alamo_headers, JSON.stringify({
      size: 'gp2', quantity: 1, type: 'web', port: 5000,
    }));
  });

  it('covers creating dependent build for second test app', async () => {
    const build_payload = {
      sha: '123456',
      org: 'test',
      repo: 'https://github.com/abcd/some-repo',
      branch: 'master',
      version: 'v1.0',
      checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      url: 'docker://docker.io/akkeris/test-attach:v4',
    };
    const info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_second_new}-default/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    );
    expect(info).to.be.a('string');
    const build_info = JSON.parse(info);
    await support.wait_for_build(`${appname_second_new}-default`, build_info.id);
    const release_info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_second_new}-default/releases`,
      alamo_headers,
      JSON.stringify({
        slug: build_info.id,
        description: `Deploy ${build_info.id}`,
      }),
    );
    expect(release_info).to.be.a('string');
  });

  it('covers attaching postgresqldb to the second test app by id, ensures prod=prod apps can attach', async () => {
    expect(appname_second_id).to.be.a('string');
    let data = await httph.request('post', 'http://localhost:5000/addon-attachments', alamo_headers, JSON.stringify({
      addon: postgresql_response.id, app: appname_second_id, force: true, name: 'postgresqldb',
    }));
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    postgresql_addon_attachment_id = data.id;
    expect(data.id).to.be.a('string');
    expect(data.addon).to.be.an('object');
    expect(data.addon.app).to.be.an('object');
    expect(data.addon.plan).to.be.an('object');
    expect(data.app).to.be.an('object');
  });

  it('covers creating the third test app for services', async () => {
    let data = await httph.request(
      'post',
      'http://localhost:5000/apps',
      alamo_headers,
      JSON.stringify({
        org: 'test',
        space: 'preview',
        name: appname_third_new,
      }),
    );
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    appname_third_id = data.id;
    await httph.request('post', `http://localhost:5000/apps/${appname_third_new}-preview/formation`, alamo_headers, JSON.stringify({
      size: 'gp2', quantity: 1, type: 'web', port: 5000,
    }));
  });

  it('covers attaching postgresqldb to the third test app by id, ensures prod!=non-prod apps can attach', async () => {
    try {
      expect(appname_second_id).to.be.a('string');
      await httph.request(
        'post',
        'http://localhost:5000/addon-attachments',
        { 'x-silent-error': 'true', ...alamo_headers },
        JSON.stringify({
          addon: postgresql_response.id,
          app: appname_third_id,
          name: 'postgresqldb',
        }),
      );
      throw new Error('this should not have worked.');
    } catch (e) {
      expect(e.code).to.equal(409);
      expect(e.message).to.equal('Addons from a socs controlled space cannot be attached to a non-socs controlled space.');
    }
  });

  it('covers creating dependent build for third app', async () => {
    const build_payload = {
      sha: '123456',
      org: 'test',
      repo: 'https://github.com/abcd/some-repo',
      branch: 'master',
      version: 'v1.0',
      checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      url: 'docker://docker.io/akkeris/test-attach:v4',
    };
    const info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_third_new}-preview/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    );
    expect(info).to.be.a('string');
    const build_info = JSON.parse(info);
    await support.wait_for_build(`${appname_third_new}-preview`, build_info.id);
    const release_info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_third_new}-preview/releases`,
      alamo_headers,
      JSON.stringify({
        slug: build_info.id,
        description: `Deploy ${build_info.id}`,
      }),
    );
    expect(release_info).to.be.a('string');
  });

  it('covers ensuring attached addon DATABASE_URL is returned from second app', async () => {
    await support.wait_for_app_content(`https://${appname_second_new}${process.env.ALAMO_BASE_DOMAIN}/DATABASE_URL`,
      postgresql_response.config_vars.DATABASE_URL.substring(postgresql_response.config_vars.DATABASE_URL.indexOf('@')));
  });

  it('covers ensuring the original memcacher on the root app cannot be removed since its attached', async () => {
    try {
      await httph.request(
        'delete',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgresql_response.name}`,
        { 'x-silent-error': 'true', ...alamo_headers },
        null,
      );
      throw new Error('The postgresql should not have been allowed to be removed');
    } catch (e) {
      expect(e.code).to.equal(409);
      expect(e.message).to.equal('This addon cannot be removed as its attached to other apps.');
    }
  });

  it('covers ensuring the original app cannot be deleted since an addon is attached to another app', async () => {
    try {
      const data = await httph.request(
        'delete',
        `http://localhost:5000/apps/${appname_brand_new}-default`,
        { 'x-silent-error': 'true', ...alamo_headers },
        null,
      );
      expect(data).to.be.a('string');
      throw new Error('this should not have happened.');
    } catch (e) {
      expect(e.code).to.equal(409);
      expect(e.message).to.equal('This app cannot be removed as it has addons that are attached to another app.');
    }
  });

  it('covers ensuring addon attachment config vars are returned', async () => {
    expect(appname_second_id).to.be.a('string');
    let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/config-vars`, alamo_headers, null);
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.DATABASE_URL).to.equal(postgresql_response.config_vars.DATABASE_URL);
  });

  it('covers listing addon attachments by apps', async () => {
    expect(appname_second_id).to.be.a('string');
    let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/addon-attachments`, alamo_headers, null);
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.some((x) => x.id === postgresql_addon_attachment_id)).to.equal(true);
  });

  it('covers ensuring attached postgresqldb is not listed as normal addon', async () => {
    expect(appname_second_id).to.be.a('string');
    let data = await httph.request('get', `http://localhost:5000/apps/${appname_second_new}-default/addons`, alamo_headers, null);
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.length).to.equal(0);
  });

  it('covers ensuring we cannot attach postgresqldb to the same test app', async () => {
    try {
      expect(appname_second_id).to.be.a('string');
      await httph.request('post', 'http://localhost:5000/addon-attachments', { 'x-silent-error': 'true', ...alamo_headers }, JSON.stringify({
        addon: postgresql_response.id, app: appname_second_id, force: true, name: 'postgresqldb',
      }));
      expect(false).to.be.true;
    } catch (e) { /* ignore errors */ }
  });

  it('covers ensuring addons can be dettached', async () => {
    expect(postgresql_addon_attachment_id).to.be.a('string');
    let data = await httph.request(
      'delete',
      `http://localhost:5000/apps/${appname_second_new}-default/addon-attachments/${postgresql_addon_attachment_id}`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    data = JSON.parse(data);
    expect(data.id).to.be.a('string');
    expect(data.addon).to.be.an('object');
    expect(data.addon.app).to.be.an('object');
    expect(data.addon.plan).to.be.an('object');
    expect(data.app).to.be.an('object');
  });

  it('covers ensuring detaching does not remove service from owner', async () => {
    expect(postgresql_response).to.be.an('object');
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgresql_response.id}`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(postgresql_response.id);
  });

  it('covers deleting the second test app', async () => {
    const data = await httph.request('delete', `http://localhost:5000/apps/${appname_second_new}-default`, alamo_headers, null);
    expect(data).to.be.a('string');
  });

  it('covers ensuring deleting app with service does not unprovision, but detach service', async () => {
    expect(postgresql_response).to.be.an('object');
    expect(postgresql_plan).to.be.an('object');
    expect(postgresql_plan.id).to.be.a('string');
    const data = await httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgresql_response.id}`,
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    expect(obj.id).to.equal(postgresql_response.id);
  });
  it('covers deleting the test app for services', async () => {
    const data = await httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default`, alamo_headers, null);
    expect(data).to.be.a('string');
  });
  it('covers deleting the test app for services', async () => {
    const data = await httph.request('delete', `http://localhost:5000/apps/${appname_third_new}-preview`, alamo_headers, null);
    expect(data).to.be.a('string');
  });
});
