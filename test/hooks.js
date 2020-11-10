/* eslint-disable no-unused-expressions */
process.env.PORT = 5000;
process.env.DEFAULT_PORT = '5000';
process.env.AUTH_KEY = 'hello';
const alamo_headers = {
  Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
};
const test = require('./support/init.js');
const circleCiHook = require('../lib/hook-types/circleci.js');
const msTeamsHook = require('../lib/hook-types/microsoft-teams.js');
const opsGenieHook = require('../lib/hook-types/opsgenie.js');
const rollBarHook = require('../lib/hook-types/rollbar.js');
const slackHook = require('../lib/hook-types/slack.js');

describe('hooks:', function () {
  this.timeout(100000);
  const server = test.create_callback_server();
  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');
  // const appname_brand_new = `alamotest${Math.floor(Math.random() * 100000)}`;
  let build_id = null;
  let placed_hooks = false;

  let testapp = null;

  it('covers testing hook type formatters', async () => {
    expect(circleCiHook.test('https://circleci.com/api/v1.1/project/github/akkeris/tests/tree/master?circle-token=abc123')).to.equal(true);
    expect(circleCiHook.test('https://token:@circleci.com/api/v1.1/project/github/akkeris/tests')).to.equal(true);
    expect(msTeamsHook.test('https://outlook.office365.com/webhook/01234567-abcd-4444-abcd-1234567890ab@98765432-dddd-5555-8888-777777777777/IncomingWebhook/1234567890abcdefedcba09876544321/ffffffff-3333-4444-5555-bbbbbbbbbbbb')).to.equal(true);
    expect(opsGenieHook.test('https://token@api.opsgenie.com/v2/alerts')).to.equal(true);
    expect(opsGenieHook.test('https://token@api.eu.opsgenie.com/v2/alerts')).to.equal(true);
    expect(opsGenieHook.test('https://www.opsgenie.com/v2/alerts/some/other/uri')).to.equal(false);
    expect(rollBarHook.test('https://api.rollbar.com/api/1/deploy')).to.equal(true);
    expect(rollBarHook.test('https://api.rollbar.com/api/1/deploy/')).to.equal(true);
    expect(rollBarHook.test('https://api.rollly.com/api/1/deploy/')).to.equal(false);
    expect(slackHook.test('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX')).to.equal(true);
    expect(slackHook.test('https://hooks.slackss.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX')).to.equal(false);
  });

  it('covers testing hook type special formatting', async() => {
    const formatReleasedWithSlug = slackHook.formatter({
      "app": {
        "name": "abcdefx",
        "id": "342bb9eb-b146-4938-80c2-163823a1a6e5"
      },
      "space": {
        "name": "qwz-fyi"
      },
      "dyno": {
        "type": "web"
      },
      "release": {
        "id": "17bd2bf7-403c-4892-8ffc-df4c12633b53",
        "created_at": "2020-06-05T17:00:03.671Z",
        "updated_at": "2020-06-05T17:00:03.671Z",
        "version": 63
      },
      "key": "abcdefx-qwz-fyi",
      "action": "released",
      "slug": {
        "image": "some.example.com/org/abcdefx-1082e549-7243-462f-b091-6903e615a405:1.436",
        "source_blob": {
          "checksum": "already-validated-auto-build",
          "url": "",
          "version": "https://github.com/akkeris/abcdefx/commit/11d55c2637815359394023d06024b2912a8f7622",
          "commit": "11d55c2637815359394023d06024b2912a8f7622",
          "author": "John Smith (johnsmith)",
          "repo": "https://github.com/akkeris/abcdefx",
          "branch": "master",
          "message": "wip: FOO-2124: Some commit message\n\nWith additional lines."
        },
        "id": "1ec275ce-651c-4907-8745-d4210aff631"
      },
      "released_at": "2020-06-05T17:00:34.488Z"
    });
    expect(formatReleasedWithSlug.text).to.equal("*abcdefx-qwz-fyi* web was released! `v63`\n```\nJohn Smith (johnsmith) - wip: FOO-2124: Some commit message\n\nWith additional lines.\n```\nFrom https://github.com/akkeris/abcdefx master `11d55c2`")
    const formatReleasedWithoutSlug = slackHook.formatter({
      "app": {
        "name": "abcdefx",
        "id": "342bb9eb-b146-4938-80c2-163823a1a6e5"
      },
      "space": {
        "name": "qwz-fyi"
      },
      "dyno": {
        "type": "web"
      },
      "release": {
        "id": "17bd2bf7-403c-4892-8ffc-df4c12633b53",
        "created_at": "2020-06-05T17:00:03.671Z",
        "updated_at": "2020-06-05T17:00:03.671Z",
        "version": 63
      },
      "key": "abcdefx-qwz-fyi",
      "action": "released",
      "slug": {
        "image": "some.example.com/org/abcdefx-1082e549-7243-462f-b091-6903e615a405:1.436",
        "id": "1ec275ce-651c-4907-8745-d4210aff631"
      },
      "released_at": "2020-06-05T17:00:34.488Z"
    });
    expect(formatReleasedWithoutSlug.text).to.equal("*abcdefx-qwz-fyi* web was released! `v63`\nFrom some.example.com/org/abcdefx-1082e549-7243-462f-b091-6903e615a405:1.436");
    const formatReleasedWithoutSlugOrRelease = slackHook.formatter({
      "app": {
        "name": "abcdefx",
        "id": "342bb9eb-b146-4938-80c2-163823a1a6e5"
      },
      "space": {
        "name": "qwz-fyi"
      },
      "dyno": {
        "type": "web"
      },
      "release": {
        "id": "17bd2bf7-403c-4892-8ffc-df4c12633b53",
      },
      "key": "abcdefx-qwz-fyi",
      "action": "released",
      "slug": {
        "image": "some.example.com/org/abcdefx-1082e549-7243-462f-b091-6903e615a405:1.436",
        "id": "1ec275ce-651c-4907-8745-d4210aff631"
      },
      "released_at": "2020-06-05T17:00:34.488Z"
    });
    expect(formatReleasedWithoutSlugOrRelease.text).to.equal("*abcdefx-qwz-fyi* web was released! `17bd2bf7-403c-4892-8ffc-df4c12633b53`\nFrom some.example.com/org/abcdefx-1082e549-7243-462f-b091-6903e615a405:1.436")
    const formatCrashed = slackHook.formatter({
      "app": {
        "name": "abcdefx",
        "id": "342bb9eb-b146-4938-80c2-163823a1a6e5"
      },
      "space": {
        "name": "qwz-fyi"
      },
      "dynos": [
        {
          "dyno": "abcdefx-6df6bc55c4-ldt45",
          "type": "web"
        }
      ],
      "key": "abcdefx-qwz-fyi",
      "action": "crashed",
      "description": "App crashed",
      "code": "H10",
      "restarts": 0,
      "crashed_at": "2020-06-02T17:45:40.656Z"
    });
    expect(formatCrashed.text).to.equal("*abcdefx-qwz-fyi* dyno crashed! `H10 - App crashed`\n```\nweb.6df6bc55c4-ldt45\n```");
    const formatCrashedMultipleDynos = slackHook.formatter({
      "app": {
        "name": "abcdefx",
        "id": "342bb9eb-b146-4938-80c2-163823a1a6e5"
      },
      "space": {
        "name": "qwz-fyi"
      },
      "dynos": [
        {
          "dyno": "abcdefx-6df6bc55c4-ldt45",
          "type": "web"
        },
        {
          "dyno": "abcdefx-6df6bc55c4-abz55",
          "type": "web"
        },
        {
          "dyno": "abcdefx-6df6bc55c4-fff55",
          "type": "worker"
        }
      ],
      "key": "abcdefx-qwz-fyi",
      "action": "crashed",
      "description": "App crashed",
      "code": "H10",
      "restarts": 0,
      "crashed_at": "2020-06-02T17:45:40.656Z"
    });
    expect(formatCrashedMultipleDynos.text).to.equal("*abcdefx-qwz-fyi* dynos crashed! `H10 - App crashed`\n```\nweb.6df6bc55c4-ldt45\nweb.6df6bc55c4-abz55\nworker.6df6bc55c4-fff55\n```");
    const formatCrashedNoDynos = slackHook.formatter({
      "app": {
        "name": "abcdefx",
        "id": "342bb9eb-b146-4938-80c2-163823a1a6e5"
      },
      "space": {
        "name": "qwz-fyi"
      },
      "key": "abcdefx-qwz-fyi",
      "action": "crashed",
      "description": "App crashed",
      "code": "H15",
      "restarts": 0,
      "crashed_at": "2020-06-02T17:45:40.656Z"
    });
    expect(formatCrashedNoDynos.text).to.equal("*abcdefx-qwz-fyi* dyno crashed! `H15 - App crashed`");
    const formatConfigChange = slackHook.formatter({
      "action": "config_change",
      "app": {
        "name": "robots",
        "id": "56e63fb9-57b1-4af3-9290-5f1ff5e9a0ea"
      },
      "space": {
        "name": "calaway"
      },
      "changes": [
        {
          "type": "update",
          "name": "FOO"
        },
        {
          "type": "delete",
          "name": "BAZ"
        },
        {
          "type": "create",
          "name": "BUZ"
        }
      ],
      "config_vars": {
        "PORT": "5000",
        "FOO": "1",
        "BAR": "5",
        "BUZ": "0"
      }
    });
    expect(formatConfigChange.text).to.equal('Config var change(s) on app `robots-calaway`:\n    • Updated `FOO`\n    • Deleted `BAZ`\n    • Created `BUZ`');
  });

  it('covers creating a an app and a hook', async () => {
    testapp = await test.create_test_app('default');
    const data = await test.add_hook(
      testapp,
      'http://localhost:8001/webhook',
      [
        'release',
        'build',
        'formation_change',
        'logdrain_change',
        'addon_change',
        'config_change',
        'destroy',
      ],
      'some secret for hash',
    );
    expect(data.events).to.be.an('array');
    expect(data.url).to.be.a('string');
    expect(data.id).to.be.a('string');
    placed_hooks = true;
  });

  it('covers firing build webhooks', async () => {
    expect(placed_hooks).to.equal(true);
    // create a build and assign the build pending hook listener
    const build_payload_promise = server.wait_for_callback('build', 'to fire on start');
    const build_info = await test.create_test_build(testapp);
    expect(build_info.id).to.be.a('string');
    build_id = build_info.id;
    let payload = await build_payload_promise;
    expect(payload.build.result).to.equal('pending');
    payload = await server.wait_for_callback('build', 'to fire on success');
    expect(payload.build.result).to.equal('succeeded');
  });


  let release_succeeded = false;
  let release_id = null; // eslint-disable-line
  it('covers firing release hooks', async () => {
    expect(placed_hooks).to.equal(true);
    const release_payload_promise = server.wait_for_callback('release', 'to fire on success');
    const release_payload = JSON.stringify({ slug: build_id, description: `Deploy ${build_id}` });
    const release_info = JSON.parse(await httph.request(
      'post',
      `http://localhost:5000/apps/${testapp.id}/releases`,
      alamo_headers,
      release_payload,
    ));
    expect(release_info.id).to.be.a('string');
    expect(release_info.status).to.equal('queued');
    release_id = release_info.id;
    const payload = await release_payload_promise;
    expect(payload.release).to.be.an('object');
    expect(payload.release.result).to.equal('succeeded');
    release_succeeded = true;
  });


  it('covers firing formation change hooks', async () => {
    expect(release_succeeded).to.equal(true);
    expect(placed_hooks).to.equal(true);

    const formation_payload_promise = server.wait_for_callback('formation_change', 'to fire');
    const formation_payload = JSON.stringify([{ type: 'web', quantity: 2, size: 'gp2' }]);
    const formation_info = await httph.request(
      'patch',
      `http://localhost:5000/apps/${testapp.id}/formation`,
      alamo_headers,
      formation_payload,
    );
    expect(formation_info).to.be.a('string');
    const payload = await formation_payload_promise;
    expect(payload.change).to.equal('update');
    expect(payload.changes).to.be.an('array');
    expect(payload.changes[0].type).to.equal('web');
    expect(payload.changes[0].quantity).to.equal(2);
  });

  let hook_id = null;
  it('covers listing hooks', async () => {
    let hook_info = await test.get_hooks(testapp);
    expect(hook_info).to.be.an('array');
    expect(hook_info.length).to.equal(1);
    [hook_info] = hook_info;
    expect(hook_info.id).to.be.a('string');
    hook_id = hook_info.id;
    expect(hook_info.events).to.be.an('array');
    expect(hook_info.url).to.be.a('string');
    expect(hook_info.created_at).to.be.a('string');
    expect(hook_info.updated_at).to.be.a('string');
  });

  it('covers getting hook info', async () => {
    expect(hook_id).to.be.a('string');
    const hook_info = await test.get_hook(testapp, hook_id);
    expect(hook_info.id).to.be.a('string');
    expect(hook_info.id).to.equal(hook_id);
    expect(hook_info.events).to.be.an('array');
    expect(hook_info.url).to.be.a('string');
    expect(hook_info.active).to.equal(true);
    expect(hook_info.created_at).to.be.a('string');
    expect(hook_info.updated_at).to.be.a('string');
  });

  it('covers updating hook', async () => {
    expect(hook_id).to.be.a('string');
    const hook_info = await test.update_hook(testapp, hook_id, 'https://foobar', false);
    expect(hook_info.id).to.be.a('string');
    expect(hook_info.id).to.equal(hook_id);
    expect(hook_info.events).to.be.an('array');
    expect(hook_info.url).to.be.a('string');
    expect(hook_info.url).to.equal('https://foobar');
    expect(hook_info.active).to.equal(false);
    expect(hook_info.created_at).to.be.a('string');
    expect(hook_info.updated_at).to.be.a('string');
  });

  it('covers getting hook results', async () => {
    expect(hook_id).to.be.a('string');
    let hook_results_info = await test.get_hook_results(testapp, hook_id);
    expect(hook_results_info).to.be.a('string');
    hook_results_info = JSON.parse(hook_results_info);
    expect(hook_results_info).to.be.an('array');
    // TODO: Inspect more on the structure.
  });

  it('covers removing hook', async () => {
    expect(hook_id).to.be.a('string');
    await test.remove_hook(testapp, hook_id);
  });

  it('ensures we clean up after ourselves.', async () => {
    await test.delete_app(testapp);
    server.close();
  });
});
