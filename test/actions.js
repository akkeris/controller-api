const { expect } = require('chai');
const http_helper = require('../lib/http_helper.js');

describe('Actions', function () {
  this.timeout(64000);
  process.env.AUTH_KEY = 'hello';
  const init = require('./support/init.js');
  const config = require('../lib/config.js');

  const akkeris_headers = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-username': 'Calaway',
    'Content-type': 'application/json',
  };

  // Nested describe block needed for correct execution order of before/after hooks
  describe('', async () => {
    let testapp;

    before(async () => {
      testapp = await init.create_test_app_with_content('OK', 'default');
    });

    after(async () => {
      await init.remove_app(testapp);
    });

    it('create a new action and then manually trigger a new run', async () => {
      const payload = {
        name: 'testaction',
        description: 'This action runs a Docker container and then exits.',
      };
      const actions = await http_helper.request('post', `http://localhost:5000/apps/${testapp.name}/actions`, akkeris_headers, payload);

      const test_action = JSON.parse(actions)[0];
      const uuid_regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
      expect(test_action.action).to.match(uuid_regex);
      expect(test_action.app).to.equal(testapp.id);
      expect(test_action.formation).to.match(uuid_regex);
      expect(test_action.name).to.equal('testaction');
      expect(test_action.description).to.equal('This action runs a Docker container and then exits.');
      expect(test_action.created_by).to.equal('Calaway');
      expect(Date.now() - Date.parse(test_action.created)).to.be.lessThan(10000);
      expect(Date.now() - Date.parse(test_action.updated)).to.be.lessThan(10000);
      expect(test_action.deleted).to.equal(false);

      const formations = await http_helper.request('get', `http://localhost:5000/apps/${testapp.name}/formation`, akkeris_headers);
      const one_off_formation = JSON.parse(formations).find((f) => f.type !== 'web');
      expect(one_off_formation.app.id).to.equal(testapp.id);
      expect(one_off_formation.id).to.match(uuid_regex);
      expect(one_off_formation.type).to.equal('actionstestaction');
      expect(one_off_formation.quantity).to.equal(1);
      expect(one_off_formation.size).to.equal(config.dyno_default_size);
      expect(one_off_formation.command).to.equal(null);
      expect(one_off_formation.port).to.equal(null);
      expect(one_off_formation.healthcheck).to.equal(null);
      expect(Date.now() - Date.parse(one_off_formation.created_at)).to.be.lessThan(10000);
      expect(Date.now() - Date.parse(one_off_formation.updated_at)).to.be.lessThan(10000);

      const pod_status_url = `${process.env.MARU_STACK_API}/v1/kube/podstatus/${testapp.space.name}/${testapp.simple_name}--${one_off_formation.type}`;
      const pod_status_before = await http_helper.request('get', pod_status_url, null);
      expect(pod_status_before).to.equal('null');

      const action_runs = await http_helper.request('post', `http://localhost:5000/apps/${testapp.name}/actions/${test_action.name}/runs`, akkeris_headers);

      await init.wait(4000);
      const pod_status_after = await http_helper.request('get', pod_status_url, null);
      expect(JSON.parse(pod_status_after)[0].ready).to.equal(true);

      const action_run = JSON.parse(action_runs)[0];
      expect(action_run.action_run).to.match(uuid_regex);
      expect(action_run.action).to.equal(test_action.action);
      expect(action_run.status).to.equal('running');
      expect(action_run.exit_code).to.equal(null);
      expect(action_run.created_by).to.equal('Calaway');
      expect(Date.now() - Date.parse(action_run.created)).to.be.lessThan(10000);
    });
  });
});
