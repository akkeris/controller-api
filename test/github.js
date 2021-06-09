/* eslint-disable no-unused-expressions */
process.env.TEST_MODE = 'true';
describe('github: ensure we can attach auto builds, submit auto builds, and remove auto builds.', function () {
  const init = require('./support/init.js'); // eslint-disable-line
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = '5000';
  const fs = require('fs');
  const httph = require('../lib/http_helper.js');
  const git = require('../lib/git.js');
  const { expect } = require('chai');
  const alamo_headers = { Authorization: process.env.AUTH_KEY, 'x-username': 'test', 'x-elevated-access': 'true' };
  const app_name = `alamotest${Math.round(Math.random() * 10000)}`;
  const webhook201 = fs.readFileSync('./test/support/github-webhook-success-201.json').toString('utf8');
  const webhook205branch = fs.readFileSync('./test/support/github-webhook-fail-wrong-branch.json').toString('utf8');
  const webhook205type = fs.readFileSync('./test/support/github-webhook-fail-wrong-type.json').toString('utf8');
  const webhookEmpty = fs.readFileSync('./test/support/github-webhook-empty-commit.json').toString('utf8');


  it('ensure we can create an app', async () => {
    const req_data = JSON.stringify({
      org: 'test', space: 'default', name: app_name, size: 'gp2', quantity: 1, type: 'web', port: 9000,
    });
    await httph.request('post', 'http://localhost:5000/apps', { Authorization: process.env.AUTH_KEY }, req_data);
  });

  it('ensure we can add an auto build', async () => {
    const req_data = JSON.stringify({
      repo: 'https://github.com/akkeris/controller-api',
      branch: 'master',
      status_check: 'true',
      auto_deploy: 'true',
      username: 'test',
      token: 'ab832239defaa3298438abb',
    });
    let data = await httph.request(
      'post',
      `http://localhost:5000/apps/${app_name}-default/builds/auto`,
      { Authorization: process.env.AUTH_KEY },
      req_data,
    );
    data = JSON.parse(data.toString());
    expect(data.status).to.equal('successful');
  });

  it('ensure if we cannot add an existing auto build if a hook already exists', async () => {
    const req_data = JSON.stringify({
      repo: 'https://github.com/akkeris/controller-api',
      branch: 'master',
      status_check: 'true',
      auto_deploy: 'true',
      username: 'test',
      token: 'existing',
    });
    const data = await httph.request(
      'post',
      `http://localhost:5000/apps/${app_name}-default/builds/auto`,
      { Authorization: process.env.AUTH_KEY, 'x-ignore-errors': 'true' },
      req_data,
    );
    expect(data).to.be.undefined;
  });

  it('ensure we do not kick off a build on the wrong branch', async () => {
    const incoming = JSON.stringify(JSON.parse(webhook205branch));
    const hash = git.calculate_hash('testing', incoming);
    const headers = { 'x-github-event': 'push', 'x-hub-signature': hash };
    const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
    expect(data.toString('utf8')).to.equal('This webhook took place on a branch that isnt of interest.');
  });

  it('ensure empty pushes do not cause us to fail.', async () => {
    const incoming = JSON.stringify(JSON.parse(webhookEmpty));
    const hash = git.calculate_hash('testing', incoming);
    const headers = { 'x-github-event': 'push', 'x-hub-signature': hash };
    const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
    expect(data.toString('utf8')).to.equal('This webhook was not an event that had any affect.');
  });

  it('ensure we politely respond, but do not kick off a build for pull requests', async () => {
    // note we check for only one build later.
    const incoming = JSON.stringify(JSON.parse(webhook205type));
    const hash = git.calculate_hash('testing', incoming);
    const headers = { 'x-github-event': 'pull_request', 'x-hub-signature': hash };
    const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
    const json_data = JSON.parse(data.toString('utf8'));
    expect(json_data.code).to.equal(201);
    expect(json_data.message).to.equal('Roger that, message received.');
  });

  it('ensure we do not kick off a build on an invalid type', async () => {
    const incoming = JSON.stringify(JSON.parse(webhook205type));
    const hash = git.calculate_hash('testing', incoming);
    const headers = { 'x-github-event': 'fugazi', 'x-hub-signature': hash };
    const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
    expect(data.toString('utf8')).to.equal('This webhook was not an event that were interested in.');
  });

  it('ensure we do not kick off anything if the key is invalid (w/invalid event)', async () => {
    try {
      const incoming = JSON.stringify(JSON.parse(webhook205type));
      const hash = git.calculate_hash('foo', incoming);
      const headers = { 'x-github-event': 'fugazi', 'x-hub-signature': hash, 'x-ignore-errors': 'true' };
      const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
      expect(data.toString('utf8')).to.equal('This webhook was not an event that were interested in.');
      expect(true).to.be.false;
    } catch (e) { /* ignore */ }
  });

  it('ensure we do not kick off anything if the key is invalid (w/valid event)', async () => {
    try {
      const incoming = JSON.stringify(JSON.parse(webhook205type));
      const hash = git.calculate_hash('foo', incoming);
      const headers = { 'x-github-event': 'push', 'x-hub-signature': hash, 'x-ignore-errors': 'true' };
      const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
      expect(data.toString('utf8')).to.equal('This webhook was not an event that were interested in.');
      expect(true).to.be.false;
    } catch (e) { /* ignore */ }
  });

  it('ensure we can kick off an auto-build with github', async () => {
    const incoming = JSON.stringify(JSON.parse(webhook201));
    const hash = git.calculate_hash('testing', incoming);
    const headers = { 'x-github-event': 'push', 'x-hub-signature': hash };
    const data = await httph.request('post', `http://localhost:5000/apps/${app_name}-default/builds/auto/github`, headers, incoming);
    const json_data = JSON.parse(data.toString('utf8'));
    expect(json_data.code).to.equal(201);
    expect(json_data.message).to.equal('Roger that, message received.');
  });

  it('ensure we can see the builds running from github hook', async () => {
    let wait = 0;
    let data = null;
    do {
      // eslint-disable-next-line no-await-in-loop
      await (async function () { return new Promise((res /* rej */) => { setTimeout(() => { res(); }, 500); }); }());
      // eslint-disable-next-line no-await-in-loop
      data = await httph.request(
        'get',
        `http://localhost:5000/apps/${app_name}-default/builds`,
        { Authorization: process.env.AUTH_KEY },
        null,
      );
      data = JSON.parse(data.toString());
      expect(data).to.be.an('array');
      wait++;
    } while (data.length === 0 && wait < 20);
    expect(data.length).to.equal(1);
    expect(data[0].source_blob.checksum).to.equal('already-validated-auto-build');
    expect(data[0].source_blob.author).to.equal('John Smith (johnsmith)');
    expect(data[0].source_blob.commit).to.equal('3f20df245a9f25de290a6d2c2546960ba6fa40c8');
    expect(data[0].source_blob.version).to.equal('https://github.com/akkeris/controller-api/commit/3f20df245a9f25de290a6d2c2546960ba6fa40c8');
    expect(data[0].source_blob.message).to.equal('Merge pull request #29 from akkeris/controller-api-1610b\n\nEXAMPLE-1610b - fix for auto validations');
  });

  it('ensure we clean up after ourselves', async () => {
    await httph.request('delete', `http://localhost:5000/apps/${app_name}-default`, alamo_headers, null);
  });
});
