/* eslint-disable no-unused-expressions */
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';

const { expect } = require('chai');
const init = require('./support/init.js');
const httph = require('../lib/http_helper.js');

const alamo_headers = {
  Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
};
describe('lifecycle: ensure apps restart at appropriate times.', function () {
  this.timeout(300000);
  process.env.DEFAULT_PORT = '9000';
  let build_info;

  let app = null;

  it('covers creating dependent app.', async () => {
    // create an app.
    app = await init.create_test_app();
  });

  it('covers attempting to restart an app without a release or formation', async () => {
    expect(app).to.be.an('object');
    const info = await httph.request('delete', `http://localhost:5000/apps/${app.id}/dynos`, alamo_headers, null);
    expect(info).to.be.a('string');
  });


  it('covers creating worker without release', async () => {
    expect(app).to.be.an('object');
    const info = await init.create_formation(app);
    expect(info).to.be.a('string');
  });

  it('covers attempting to restart an app with formation, without a release', async () => {
    expect(app).to.be.an('object');
    const info = await httph.request('delete', `http://localhost:5000/apps/${app.id}/dynos`, alamo_headers, null);
    expect(info).to.be.a('string');
  });


  it('covers creating dependent build and release.', async () => {
    build_info = await init.create_build(app,
      'docker://docker.io/akkeris/test-lifecycle:latest',
      null,
      'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      '123456',
      'test',
      'https://github.com/abcd/some-repo',
      'master',
      'v1.0');
    await init.wait_for_build(app, build_info.id);
  });

  // test changing the port, ensure it restarts and comes up (and is down before.)
  it('ensure app does not respond to default port (9000).', async () => {
    // wait to see if the app goes unhealthy or not.
    for (let i = 0; i < 200; i++) {
      // eslint-disable-next-line no-await-in-loop
      const dynos = await init.get_dynos(app);
      const web = dynos.filter((x) => x.type === 'web' && x.state !== 'running');
      if (web.length === 0) {
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await init.wait(250);
    }
    throw new Error('The web dyno never went unhealthy.');
  });

  it('change port and quantity on application via formations batch update', async () => {
    // submit a change to the port.
    const info = await init.update_formation(app, 'web', null, 5000);
    expect(info).to.be.a('string');
  });

  // Now that we changed the port, the app should turn up by itself (and automatically be restarted/redeployed.)
  it('ensure app comes back up after changing its port to the correct value (5000).', async () => {
    await init.wait_for_app_content(app.name, '[setting return value failed.] with port [5000]');
  });

  it('covers getting metrics', async () => {
    const obj = await init.get_metrics(app);
    expect(obj).to.be.an('object');
    expect(obj.web).to.be.an('object');
    expect(obj.web.memory_usage_bytes).to.be.an('object');
    expect(obj.web.memory_rss).to.be.an('object');
    expect(obj.web.memory_cache).to.be.an('object');
    expect(obj.web.cpu_user_seconds_total).to.be.an('object');
    expect(obj.web.cpu_usage_seconds_total).to.be.an('object');
  });

  // test changing config env's make sure it restarts the server
  it('ensure app restarts and reloads config when changing config vars', async () => {
    await init.update_config_vars(app, { RETURN_VALUE: 'FOOBAR' });
    await init.wait_for_app_content(app.name, '[FOOBAR]');
  });

  let dyno_name = null;
  it('ensure app shows a running dyno.', async () => {
    // wait to see if the app goes unhealthy or not.
    for (let i = 0; i < 200; i++) {
      // eslint-disable-next-line no-await-in-loop
      const dynos = await init.get_dynos(app);
      const web = dynos.filter((x) => x.type === 'web' && x.state === 'running');
      if (web.length > 0) {
        expect(dynos).to.be.an('array');
        const datum = dynos.filter((x) => x.type === 'web' && x.state === 'running');
        expect(datum[0]).to.be.a('object');
        expect(datum[0].command).to.be.null;
        expect(datum[0].created_at).to.be.a.string;
        expect(datum[0].id).to.be.a.string;
        expect(datum[0].name).to.be.a.string;
        expect(datum[0].release).to.be.an('object');
        expect(datum[0].app).to.be.an('object');
        expect(datum[0].size).to.be.a('string');
        expect(datum[0].state).to.be.a('string');
        expect(datum[0].type).to.equal('web');
        expect(datum[0].updated_at).to.be.a('string');
        dyno_name = datum[0].name;
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await init.wait(250);
    }
    throw new Error('The web dyno never went healthy.');
  });

  it('get info on a specific dyno type.', async () => {
    expect(dyno_name).to.be.a.string;
    const data = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/dynos/${dyno_name}`, alamo_headers, null));
    expect(data).to.be.a('object');
    expect(data.command).to.be.null;
    expect(data.created_at).to.be.a.string;
    expect(data.id).to.be.a.string;
    expect(data.name).to.be.a.string;
    expect(data.release).to.be.an('object');
    expect(data.app).to.be.an('object');
    expect(data.size).to.be.a('string');
    expect(data.state).to.be.a('string');
    expect(data.type).to.equal('web');
    expect(data.updated_at).to.be.a('string');
  });

  it('restart specific dyno', async () => {
    expect(dyno_name).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'delete',
      `http://localhost:5000/apps/${app.id}/dynos/web.${dyno_name}`,
      alamo_headers,
      null,
    ));
    expect(data.type).to.equal('web');
    expect(data.dyno).to.equal(dyno_name);
  });

  it('update quantity of a dyno type', async () => {
    expect(dyno_name).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'patch',
      `http://localhost:5000/apps/${app.id}/formation/web`,
      alamo_headers,
      JSON.stringify({ quantity: 2 }),
    ));
    expect(data.quantity).to.equal(2);
  });

  it('restart unknown dyno', async () => {
    expect(dyno_name).to.be.a('string');
    try {
      await httph.request(
        'delete',
        `http://localhost:5000/apps/${app.id}/dynos/foobar`,
        { ...alamo_headers, 'x-silent-error': true },
        null,
      );
      expect(true).to.equal(false);
    } catch (err) {
      /* do nothing */
    }
  });

  it('restart dyno type', async () => {
    expect(dyno_name).to.be.a('string');
    const data = JSON.parse(await httph.request('delete', `http://localhost:5000/apps/${app.id}/dynos/web`, alamo_headers));
    expect(data.type).to.equal('web');
    expect(data.dyno).to.be.undefined;
  });

  it('restart all dynos', async () => {
    expect(dyno_name).to.be.a('string');
    const data = JSON.parse(await httph.request('delete', `http://localhost:5000/apps/${app.id}/dynos`, alamo_headers));
    expect(data.type).to.be.undefined;
    expect(data.dyno).to.be.undefined;
  });

  it('ensure we still have two dynos running.', async () => {
    const dynos = await init.get_dynos(app);
    expect(dynos).to.be.an('array');
    expect(dynos.length).to.be.at.least(2);
  });

  it('covers removing test app.', async () => {
    // destroy the app.
    await init.delete_app(app);
  });
});
