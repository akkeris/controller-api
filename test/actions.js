const {
  expect
} = require('chai');
const http_helper = require('../lib/http_helper.js');

/**
 * Try to fetch the status of a completed pod every half second for up to 30 seconds
 * @param {string} url URL of the pod status endpoint of the region-api
 * @returns Status information of the pod in an object, if the pod exists and was complete
 */
const watch = async (url) => {
  for (let i = 0; i < 60; i++) {
    const pod_status_url = url;
    const pod_status_after_finish = await http_helper.request('get', pod_status_url, null); // eslint-disable-line
    if (pod_status_after_finish && pod_status_after_finish !== 'null') {
      const status = JSON.parse(pod_status_after_finish)[0];
      // Pod is done
      if (status.output === 'Completed' || status.output === 'Failed') {
        return status;
      }
    }
    // Wait half of a second
    await (new Promise((res) => setTimeout(res, 500))); // eslint-disable-line
  }
  return null;
};

describe('actions:', function () {
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
  describe('', function () {
    let testapp;
    let test_action;
    let created_action = false;

    before(async () => {
      testapp = await init.create_test_app();
    });

    after(async () => {
      await init.remove_app(testapp);
    });

    it('covers creating an action and manually triggering an action run', async () => {
      // Create action
      const payload = {
        name: 'testaction',
        description: 'This action runs a Docker container and then exits.',
        command: 'sleep 10',
        options: {
          image: 'busybox:latest',
        },
      };
      const action = await http_helper.request('post', `http://localhost:5000/apps/${testapp.name}/actions`, akkeris_headers, payload);

      // Verify result
      test_action = JSON.parse(action);
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

      // Verify formation
      const formations = await http_helper.request('get', `http://localhost:5000/apps/${testapp.name}/formation`, akkeris_headers);
      const one_off_formation = JSON.parse(formations).find((f) => f.type !== 'web');
      expect(one_off_formation.app.id).to.equal(testapp.id);
      expect(one_off_formation.id).to.match(uuid_regex);
      expect(one_off_formation.type).to.equal('actionstestaction');
      expect(one_off_formation.quantity).to.equal(1);
      expect(one_off_formation.size).to.equal(config.dyno_default_size);
      expect(one_off_formation.command).to.equal('sleep 10');
      expect(one_off_formation.port).to.equal(null);
      expect(one_off_formation.healthcheck).to.equal(null);
      expect(Date.now() - Date.parse(one_off_formation.created_at)).to.be.lessThan(10000);
      expect(Date.now() - Date.parse(one_off_formation.updated_at)).to.be.lessThan(10000);

      created_action = true;

      // Verify pod does not exist before action run created
      const pod_status_url = `${process.env.MARU_STACK_API}/v1/kube/podstatus/${testapp.space.name}/${testapp.simple_name}--${one_off_formation.type}`;
      const pod_status_before = await http_helper.request('get', pod_status_url, null);
      expect(pod_status_before).to.equal('null');

      const action_run_response = await http_helper.request('post', `http://localhost:5000/apps/${testapp.name}/actions/${test_action.name}/runs`, akkeris_headers);
      const action_run = JSON.parse(action_run_response);

      // Verify that action run was properly in the database
      expect(action_run.action_run).to.match(uuid_regex);
      expect(action_run.action).to.equal(test_action.action);
      expect(action_run.status).to.equal('starting');
      expect(action_run.exit_code).to.equal(null);
      expect(action_run.created_by).to.equal('Calaway');
      expect(action_run.started_at).to.equal(null);
      expect(action_run.finished_at).to.equal(null);
      expect(action_run.source).to.equal('manual_trigger');
      expect(Date.now() - Date.parse(action_run.created)).to.be.lessThan(10000);

      // Wait 8 seconds
      await init.wait(8000);

      // Verify that action run has started with Kubernetes
      const pod_status_after_start = await http_helper.request('get', pod_status_url, null);
      expect(JSON.parse(pod_status_after_start)[0].ready).to.equal(true);

      // We don't have the apps-watcher updating the test database so we can't check
      // and see if the database updated with the results.
      // TODO: May need to revisit this in the future (commented out code below)

      // Verify that action run has started in the database
      // const run_started_details_response = await http_helper.request(
      //   'get',
      //   `http://localhost:5000/apps/${testapp.name}/actions/${test_action.name}/runs/${action_run.action_run}`,
      //   akkeris_headers,
      // );
      // const run_started_details = JSON.parse(run_started_details_response);
      // expect(run_started_details.status).to.equal('running');

      // Wait 10 seconds
      await init.wait(10000);

      // Verify that action run status was updated as completed
      // const run_finished_details_response = await http_helper.request(
      //   'get',
      //   `http://localhost:5000/apps/${testapp.name}/actions/${test_action.name}/runs/${action_run.action_run}`,
      // );
      // const run_finished_details = JSON.parse(run_finished_details_response);
      // expect(run_finished_details.status).to.equal('success');
      // expect(run_finished_details.exit_code).to.equal(0);

      // Verify that action run completed with Kubernetes and was deleted

      // Bit of a race condition here with the apps-watcher & region-api deleting the pod
      // We don't want to wait TOO long, because then the tests would take forever
      // So, if the status is null it's a success.
      // If it's not, make sure the run completed by checking the state
      const pod_status_after_finish = await http_helper.request('get', pod_status_url, null);
      if (pod_status_after_finish !== null) {
        expect(JSON.parse(pod_status_after_finish)[0].state.terminated.reason).to.equal('Completed');
        expect(JSON.parse(pod_status_after_finish)[0].state.terminated.exitCode).to.equal(0);
      }
    });

    it('covers updating an action', async () => {
      // stub
      expect(created_action).to.equal(true);
      const payload = {
        description: '',
        command: 'sleep 10',
        options: {
          image: 'busybox:1.34',
        },
      };
      // Test updating fields
      // Test removing fields
      const update_action_response = await http_helper.request('patch', `http://localhost:5000/apps/${testapp.name}/actions/${test_action.name}`, akkeris_headers, payload);
      const action_update = JSON.parse(update_action_response);

      expect(action_update.description).to.equal('');
      expect(action_update.formation.options.image).to.equal('busybox:1.34');
    });

    it('covers triggering an action on an event', () => {
      // stub
      expect(created_action).to.equal(true);
      // Create an action that is triggered by an event
      // Fire that event (config change is pretty easy)
      // Make sure that the action fired and completed
    });

    it.only('covers actions that fail during execution', async () => {
      // Create and trigger an action run that is expected to fail
      // Make sure that the result is "failure" and the exit code is expected
      const payload = {
        name: 'badtestaction',
        description: 'This action tries to run a Docker container, but it fails.',
        command: 'filenotfound',
        options: {
          image: 'busybox:latest',
        },
      };
      try {
        // Create action
        await http_helper.request('post', `http://localhost:5000/apps/${testapp.name}/actions`, akkeris_headers, payload);

        // Trigger run
        await http_helper.request('post', `http://localhost:5000/apps/${testapp.name}/actions/badtestaction/runs`, akkeris_headers);

        // Watch for the pod to be done
        const pod_status = await watch(`${process.env.MARU_STACK_API}/v1/kube/podstatus/${testapp.space.name}/${testapp.simple_name}--actionsbadtestaction`);
        expect(pod_status).to.not.equal(null);
        expect(pod_status.output).to.equal('Failed');
      } catch (err) {
        console.error(err);
        expect(err).to.equal(null);
      }
    });
  });
});