/* eslint-disable no-unused-expressions */
process.env.DEFAULT_PORT = '5000';
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const { expect } = require('chai');
const util = require('util');
const httph = require('../lib/http_helper.js');

const alamo_headers = { Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-elevated-access': 'true' };

const request = util.promisify(httph.request);

describe('secure keys: creating, attaching and deleting', function () {
  const init = require('./support/init.js'); // eslint-disable-line
  this.timeout(1000000);

  const first_app = `alamotestsk${Math.floor(Math.random() * 10000)}`;
  const second_app = `alamotestsk${Math.floor(Math.random() * 10000)}`;
  const unique_var1 = Math.random().toString();
  const unique_var2 = Math.random().toString();

  it('covers creating test apps', async () => {
    await request(
      'post',
      'http://localhost:5000/apps',
      alamo_headers,
      JSON.stringify({ org: 'test', space: 'preview', name: first_app }),
    );
    await request(
      'post',
      `http://localhost:5000/apps/${first_app}-preview/formation`,
      alamo_headers,
      JSON.stringify({ type: 'web', port: 2000 }),
    );
    await request(
      'patch',
      `http://localhost:5000/apps/${first_app}-preview/config-vars`,
      alamo_headers,
      JSON.stringify({ KEEP_ME: unique_var1 }),
    );
    await request(
      'post',
      'http://localhost:5000/apps',
      alamo_headers,
      JSON.stringify({ org: 'test', space: 'preview', name: second_app }),
    );
    await request(
      'post',
      `http://localhost:5000/apps/${second_app}-preview/formation`,
      alamo_headers,
      JSON.stringify({ type: 'web', port: 2000 }),
    );
    await request(
      'patch',
      `http://localhost:5000/apps/${second_app}-preview/config-vars`,
      alamo_headers,
      JSON.stringify({ KEEP_ME: unique_var2 }),
    );
  });

  let addon = null;
  it('covers provisioning secure keys', async () => {
    addon = JSON.parse(await request(
      'post',
      `http://localhost:5000/apps/${first_app}-preview/addons`,
      alamo_headers,
      JSON.stringify({ plan: 'securekey:fortnightly' }),
    ));
    expect(addon.id).to.be.a('string');
    expect(addon.config_vars.SECURE_KEY).to.be.a('string');
  });

  it('covers ensuring key is in config vars', async () => {
    const config_vars = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${first_app}-preview/config-vars`,
      alamo_headers,
      null,
    ));
    expect(config_vars.SECURE_KEY).to.equal(addon.config_vars.SECURE_KEY);
    expect(config_vars.KEEP_ME).to.equal(unique_var1);
  });

  it('creates test app to ensure secure key reaches env', async () => {
    const build_payload = {
      sha: '123456',
      org: 'test',
      repo: 'https://github.com/abcd/some-repo',
      branch: 'master',
      version: 'v1.0',
      checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      url: 'docker://docker.io/akkeris/test-sample:latest',
    };
    const build_info = JSON.parse(await request(
      'post',
      `http://localhost:5000/apps/${first_app}-preview/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    ));
    const build_info2 = JSON.parse(await request(
      'post',
      `http://localhost:5000/apps/${second_app}-preview/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    ));
    await init.wait_for_build(`${first_app}-preview`, build_info.id);
    await init.wait_for_build(`${second_app}-preview`, build_info2.id);
    const content = JSON.parse(await init.wait_for_app_content(`${first_app}-preview`, null, '/environment'));
    expect(content.SECURE_KEY).to.equal(addon.config_vars.SECURE_KEY);
    expect(content.KEEP_ME).to.equal(unique_var1);
  });

  it('covers second app does not have config vars', async () => {
    const config_vars = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${second_app}-preview/config-vars`,
      alamo_headers,
      null,
    ));
    expect(config_vars.SECURE_KEY).to.be.undefined;
    expect(config_vars.KEEP_ME).to.equal(unique_var2);
  });

  let addon_attachment = null; // eslint-disable-line
  it('covers adding first secure key to second app', async () => {
    addon_attachment = JSON.parse(await request(
      'post',
      `http://localhost:5000/apps/${second_app}-preview/addon-attachments`,
      alamo_headers,
      JSON.stringify({
        addon: addon.id, app: `${second_app}-preview`, force: true, name: 'securekey',
      }),
    ));
    const config_vars = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${second_app}-preview/config-vars`,
      alamo_headers,
      null,
    ));
    expect(config_vars.SECURE_KEY).to.equal(addon.config_vars.SECURE_KEY);
    expect(config_vars.KEEP_ME).to.equal(unique_var2);
  });
  it('covers rotating secure keys', async () => {
    await request(
      'post',
      `http://localhost:5000/apps/${first_app}-preview/addons/${addon.id}/actions/rotate`,
      alamo_headers,
      null,
    );
    const config_vars = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${second_app}-preview/config-vars`,
      alamo_headers,
      null,
    ));
    const config_vars2 = JSON.parse(await request(
      'get',
      `http://localhost:5000/apps/${first_app}-preview/config-vars`,
      alamo_headers,
      null,
    ));
    expect(config_vars.SECURE_KEY).to.not.equal(addon.config_vars.SECURE_KEY);
    expect(config_vars.SECURE_KEY).to.equal(config_vars2.SECURE_KEY);
    expect(config_vars2.KEEP_ME).to.equal(unique_var1);
    expect(config_vars.KEEP_ME).to.equal(unique_var2);
    const secondary1 = addon.config_vars.SECURE_KEY.split(',')[0];
    const primary2 = config_vars.SECURE_KEY.split(',')[1];
    expect(secondary1).to.equal(primary2);
  });

  it('covers removing test apps.', async () => {
    await request(
      'delete',
      `http://localhost:5000/apps/${second_app}-preview`,
      alamo_headers,
      null,
    );
    await request(
      'delete',
      `http://localhost:5000/apps/${first_app}-preview`,
      alamo_headers,
      null,
    );
  });
});
