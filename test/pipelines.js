/* eslint-disable no-unused-expressions */
process.env.AUTH_KEY = 'hello';

const pipeline1_sources = {
  sha: '123456',
  org: 'ocatnner',
  repo: 'https://github.com/abcd/some-repo',
  branch: 'master',
  version: 'v1.0',
  checksum: 'sha256:75ef6bfeb0828a2d04dc515137df2c68e9774d9f38bd182da807e0a713d81c34',
  url: 'docker://docker.io/akkeris/test-pipelines2:latest',
  docker_registry: '',
  docker_login: '',
  docker_password: '',
};
const pipeline2_sources = {
  sha: '123456',
  org: 'ocatnner',
  repo: 'https://github.com/abcd/some-repo',
  branch: 'master',
  version: 'v1.0',
  checksum: 'sha256:7e5bfcb419ba312f8c8c9b26109d4bfa3da3a8579cf60eeed689b6f405102291',
  url: 'docker://docker.io/akkeris/test-pipelines3:latest',
  docker_registry: '',
  docker_login: '',
  docker_password: '',
};


describe('pipelines', function () {
  const init = require('./support/init.js'); // eslint-disable-line
  this.timeout(300000);
  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');

  const app1 = 'pl1';
  const app2 = 'pl2';
  const app3 = 'pl1';
  const app4 = 'pl4';
  let pipeline1_release_id = null;
  let app1_coupling_id = null;
  let app2_coupling_id = null;
  let app3_coupling_id = null;
  let app4_coupling_id = null;
  let pipeline_id = null;
  let app1_id = null;
  let app2_id = null;
  let app3_id = null;
  let app4_id = null;

  it('pre-check removing multiple apps for pipelining (1).', async () => {
    await init.remove_app_if_exists(`${app1}-pipline-test-space1`);
  });
  it('pre-check removing multiple apps for pipelining (2).', async () => {
    await init.remove_app_if_exists(`${app2}-pipline-test-space1`);
  });
  it('pre-check removing multiple apps for pipelining (3).', async () => {
    await init.remove_app_if_exists(`${app3}-pipline-test-space2`);
  });
  it('pre-check removing multiple apps for pipelining (4).', async () => {
    await init.remove_app_if_exists(`${app4}-pipline-test-space3`);
  });

  it('covers getting pipeline stages', async () => {
    const data = JSON.parse(await httph.request('get', 'http://localhost:5000/pipeline-stages', init.alamo_headers, null));
    expect(data.review).to.equal('development');
    expect(data.development).to.equal('staging');
    expect(data.staging).to.equal('production');
    expect(data.production).to.be.null;
  });

  it('covers creating pipline', async () => {
    // remove the pipeline just incase, we'll ignore the result.
    await init.remove_pipeline_if_exists('test-pipeline');
    const data = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipelines',
      init.alamo_headers,
      JSON.stringify({ name: 'test-pipeline' }),
    ));
    expect(data.name).to.be.a('string');
    expect(data.id).to.be.a('string');
    expect(data.created_at).to.be.a('string');
    expect(data.updated_at).to.be.a('string');
  });

  it('ensure non-existant pipeline couplings return a 404.', async () => {
    try {
      await httph.request(
        'get',
        'http://localhost:5000/pipelines/non-existant-pipeline/pipeline-couplings',
        { 'x-silent-error': true, ...init.alamo_headers },
        null,
      );
      expect(true).to.equal(false);
    } catch (err) {
      expect(err.code).to.equal(404);
    }
  });

  it('ensure pipeline couplings return a blank array if pipeline exists without couplings.', async () => {
    const couplings = await JSON.parse(await httph.request(
      'get',
      'http://localhost:5000/pipelines/test-pipeline/pipeline-couplings',
      init.alamo_headers,
      null,
    ));
    expect(couplings).to.be.an('array');
    expect(couplings.length).to.equal(0);
  });

  it('covers getting pipline', async () => {
    const data = JSON.parse(await httph.request(
      'get',
      'http://localhost:5000/pipelines/test-pipeline',
      init.alamo_headers,
      null,
    ));
    expect(data.name).to.be.a('string');
    expect(data.id).to.be.a('string');
    expect(data.created_at).to.be.a('string');
    expect(data.updated_at).to.be.a('string');
  });

  it('covers listing piplines', async () => {
    const data = JSON.parse(await httph.request('get', 'http://localhost:5000/pipelines', init.alamo_headers, null));
    expect(data).to.be.an('array');
    data.forEach((datum) => {
      expect(datum.name).to.be.a('string');
      expect(datum.id).to.be.a('string');
      expect(datum.created_at).to.be.a('string');
      expect(datum.updated_at).to.be.a('string');
    });
  });

  it('covers not allowing duplicate piplines', async () => {
    try {
      await httph.request(
        'post',
        'http://localhost:5000/pipelines',
        { 'x-silent-error': true, ...init.alamo_headers },
        JSON.stringify({ name: 'test-pipeline' }),
      );
    } catch (e) {
      expect(e.code).to.equal(422);
      expect(e.message).to.equal('The specified pipeline already exists.');
    }
  });
  // create three spaces
  it('dependency on having spaces for pipelines (first).', async () => {
    await init.create_space('pipline-test-space1', 'test space for pipelines (1)');
  });
  it('dependency on having spaces for pipelines (second).', async () => {
    await init.create_space('pipline-test-space2', 'test space for pipelines (2)');
  });
  it('dependency on having spaces for pipelines (third).', async () => {
    await init.create_space('pipline-test-space3', 'test space for pipelines (3)');
  });

  it('creating multiple apps for pipelining (1).', async () => {
    this.timeout(0);
    await init.create_test_app('pipline-test-space1', app1, 5000);
    const build_obj = JSON.parse(await httph.request(
      'post',
      `http://localhost:5000/apps/${app1}-pipline-test-space1/builds`,
      init.alamo_headers,
      JSON.stringify(pipeline1_sources),
    ));
    expect(build_obj.id).to.be.a('string');
    // wait for the build to succeed
    await init.wait_for_app_content(`${app1}-pipline-test-space1`, 'pipeline1');
    const release_obj = await init.latest_release(`${app1}-pipline-test-space1`);
    expect(release_obj.id).to.be.a('string');
    pipeline1_release_id = release_obj.id;
  });

  it('creating multiple apps for pipelining (2).', async () => {
    await init.create_test_app('pipline-test-space1', app2, 5000);
  });

  it('creating multiple apps for pipelining (3).', async () => {
    await init.create_test_app('pipline-test-space2', app3, 5000);
  });

  it('creating multiple apps for pipelining (4).', async () => {
    await init.create_test_app('pipline-test-space3', app4, 5000);
  });

  it('creating pipeline coupling between app1 and app2 in same space.', async () => {
    await httph.request('post', 'http://localhost:5000/pipeline-couplings', init.alamo_headers,
      JSON.stringify({ app: `${app1}-pipline-test-space1`, pipeline: 'test-pipeline', stage: 'review' }));
    // create coupling with a check.
    const pipeline_coupling = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipeline-couplings',
      init.alamo_headers,
      JSON.stringify({
        app: `${app2}-pipline-test-space1`,
        pipeline: 'test-pipeline',
        stage: 'development',
        required_status_checks: { contexts: ['test/me'] },
      }),
    ));
    // now remove the check.
    await httph.request(
      'patch',
      `http://localhost:5000/pipeline-couplings/${pipeline_coupling.id}`,
      init.alamo_headers,
      JSON.stringify({ required_status_checks: { contexts: [] } }),
    );
  });

  it('creating pipeline coupling between app2 -> app3 and app4 in separate spaces.', async () => {
    await httph.request('post', 'http://localhost:5000/pipeline-couplings', init.alamo_headers,
      JSON.stringify({ app: `${app3}-pipline-test-space2`, pipeline: 'test-pipeline', stage: 'staging' }));
    await httph.request('post', 'http://localhost:5000/pipeline-couplings', init.alamo_headers,
      JSON.stringify({ app: `${app4}-pipline-test-space3`, pipeline: 'test-pipeline', stage: 'staging' }));
  });

  it('ensure couplings are present in list.', async () => {
    const data = JSON.parse(await httph.request(
      'get',
      'http://localhost:5000/pipelines/test-pipeline/pipeline-couplings',
      init.alamo_headers,
      null,
    ));
    let found_app1 = false;
    let found_app2 = false;
    let found_app3 = false;
    let found_app4 = false;
    data.forEach((coupling) => {
      if (coupling.app.name === (`${app1}-pipline-test-space1`)) {
        found_app1 = true;
        pipeline_id = coupling.pipeline.id;
        app1_id = coupling.app.id;
        app1_coupling_id = coupling.id;
      } else if (coupling.app.name === (`${app2}-pipline-test-space1`)) {
        found_app2 = true;
        app2_coupling_id = coupling.id;
        app2_id = coupling.app.id;
      } else if (coupling.app.name === (`${app3}-pipline-test-space2`)) {
        found_app3 = true;
        app3_coupling_id = coupling.id;
        app3_id = coupling.app.id;
      } else if (coupling.app.name === (`${app4}-pipline-test-space3`)) {
        found_app4 = true;
        app4_coupling_id = coupling.id;
        app4_id = coupling.app.id;
      }
    });
    expect(found_app1).to.equal(true);
    expect(found_app2).to.equal(true);
    expect(found_app3).to.equal(true);
    expect(found_app4).to.equal(true);
  });

  // use case: pipeline to the same space one to one
  let pipeline_promotion_id = null;
  it('covers promoting one app to another in the same space.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app1_id } },
        targets: [{ app: { id: app2_id } }],
      }),
    ));
    expect(data.status).to.equal('successful');
    expect(data.id).to.be.a('string');
    pipeline_promotion_id = data.id;
    await init.wait_for_app_content(`${app2}-pipline-test-space1`, 'pipeline1');
  });

  // use case: pipeline to multiple spaces
  //           pipeline a build from another pipelined build.
  //           pipeline one to many but only one promotion
  it('covers promoting one app to multiple apps.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(app3_coupling_id).to.be.a('string');
    expect(app4_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app2_id } },
        targets: [{ app: { id: app3_id } },
          { app: { id: app4_id } }],
      }),
    ));
    expect(data.status).to.equal('successful');
    expect(data.id).to.be.a('string');
    expect(await init.wait_for_app_content(`${app3}-pipline-test-space2`, 'pipeline1')).to.equal('pipeline1');
    expect(await init.wait_for_app_content(`${app4}-pipline-test-space3`, 'pipeline1')).to.equal('pipeline1');
    const config_vars = JSON.parse(await httph.request(
      'patch',
      `http://localhost:5000/apps/${app4}-pipline-test-space3/config-vars`,
      init.alamo_headers,
      JSON.stringify({ FOO: 'BAR' }),
    ));
    expect(config_vars).to.be.a('object');
    expect(config_vars.FOO).to.equal('BAR');
    expect(await init.wait_for_app_content(`${app4}-pipline-test-space3`, 'pipeline1')).to.equal('pipeline1');
  });

  it('covers pulling promotions', async () => {
    const data = JSON.parse(await httph.request('get', 'http://localhost:5000/pipeline-promotions', init.alamo_headers, null));
    let found = false;
    data.forEach((e) => {
      if (e.id === pipeline_promotion_id) {
        found = true;
      }
    });
    expect(found).to.equal(true);
  });

  it('covers pulling a specific promotion', async () => {
    expect(pipeline_promotion_id).to.be.a('string');
    await httph.request('get', `http://localhost:5000/pipeline-promotions/${pipeline_promotion_id}`, init.alamo_headers, null);
  });

  it('covers pulling promotion targets', async () => {
    expect(pipeline_promotion_id).to.be.a('string');
    await httph.request(
      'get',
      `http://localhost:5000/pipeline-promotions/${pipeline_promotion_id}/promotion-targets`,
      init.alamo_headers,
      null,
    );
  });

  // Ensure the pipeline coupling end points work
  it('covers explicit pipeline coupling end point.', async () => {
    expect(app1_coupling_id).to.be.a('string');
    await httph.request('get', `http://localhost:5000/pipeline-couplings/${app1_coupling_id}`, init.alamo_headers, null);
  });

  // Create a new build on the source app.
  it('creating a new build on the original source app.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(app3_coupling_id).to.be.a('string');
    expect(app4_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    // create the second build
    const build_obj = JSON.parse(await httph.request(
      'post',
      `http://localhost:5000/apps/${app1}-pipline-test-space1/builds`,
      init.alamo_headers,
      JSON.stringify(pipeline2_sources),
    ));
    expect(build_obj.id).to.be.a('string');
    expect(await init.wait_for_app_content(`${app1}-pipline-test-space1`, 'pipeline2')).to.equal('pipeline2');
  });


  // Begin pipeline status check tests
  it('ensure required statuses cannot be added to the review stage.', async () => {
    expect(app2_coupling_id).to.be.a('string');
    try {
      await httph.request(
        'patch',
        `http://localhost:5000/pipeline-couplings/${app1_coupling_id}`,
        { 'x-silent-error': true, ...init.alamo_headers },
        JSON.stringify({
          app: `${app2}-pipline-test-space1`,
          pipeline: 'test-pipeline',
          stage: 'review',
          required_status_checks: {
            contexts: ['foo/bar'],
          },
        }),
      );
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.code).to.equal(422);
      expect(e.message).to.equal('Required status checks cannot be added to a pipelines review stage.');
    }
  });

  it('ensure a pipeline status check can be added (afterwards) to a coupling', async () => {
    expect(app2_coupling_id).to.be.a('string');

    const coupling = JSON.parse(await httph.request(
      'patch',
      `http://localhost:5000/pipeline-couplings/${app2_coupling_id}`,
      init.alamo_headers,
      JSON.stringify({
        app: `${app2}-pipline-test-space1`,
        pipeline: 'test-pipeline',
        stage: 'development',
        required_status_checks: {
          contexts: ['foo/bar'],
        },
      }),
    ));
    expect(coupling.app.name).to.equal(`${app2}-pipline-test-space1`);
    expect(coupling.pipeline.name).to.equal('test-pipeline');
    expect(coupling.stage).to.equal('development');
    expect(coupling.required_status_checks).to.be.an('object');
    expect(coupling.required_status_checks.contexts).to.be.an('array');
    expect(coupling.required_status_checks.contexts[0]).to.equal('foo/bar');
  });

  it('ensure a status check prevents a pipeline from promoting.', async () => {
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    try {
      JSON.parse(await httph.request(
        'post',
        'http://localhost:5000/pipeline-promotions',
        { 'x-silent-error': true, ...init.alamo_headers },
        JSON.stringify({
          pipeline: { id: pipeline_id },
          source: { app: { id: app1_id } },
          targets: [{ app: { id: app2_id } }],
        }),
      ));
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.code).to.equal(409);
      expect(e.message).to.equal('This promotion was stopped as it was deemed unsafe:\nThe app pl2-pipline-test-space1 at stage development requires the status "foo/bar" to pass in order to promote.');
    }
  });


  it('ensure elevated access can promote with unsafe.', async () => {
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    await httph.request('post', 'http://localhost:5000/pipeline-promotions', init.alamo_headers,
      JSON.stringify({
        safe: false, pipeline: { id: pipeline_id }, source: { app: { id: app1_id } }, targets: [{ app: { id: app2_id } }],
      }));
  });

  it('ensure a successful status check allows a promotion of a pipeline, and that checks can be removed.', async () => {
    const release = await init.latest_release(app1_id);
    await httph.request('post', `http://localhost:5000/apps/${app1_id}/releases/${release.id}/statuses`, init.alamo_headers,
      JSON.stringify({
        name: 'foo bar check', context: 'foo/bar', state: 'success', description: 'foobar',
      }));
    await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app1_id } },
        targets: [{ app: { id: app2_id } }],
      }),
    );
    JSON.parse(await httph.request(
      'patch',
      `http://localhost:5000/pipeline-couplings/${app2_coupling_id}`,
      init.alamo_headers,
      JSON.stringify({
        app: `${app2}-pipline-test-space1`,
        pipeline: 'test-pipeline',
        stage: 'development',
        required_status_checks: {
          contexts: [],
        },
      }),
    ));
  });

  it('ensure a set of statuses can be pulled by pipeline', async () => {
    const statuses = JSON.parse(await httph.request(
      'get',
      'http://localhost:5000/pipelines/test-pipeline/statuses',
      init.alamo_headers,
      null,
    ));
    expect(statuses.length).to.equal(1);
    expect(statuses[0].context).to.equal('foo/bar');
    expect(statuses[0].name).to.equal('foo bar check');
  });

  // /end pipeline status check tests


  // Restart target apps and ensure they still have original first build.
  it('restarting/redeploying target pipelined apps, ensuring they still have original build', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(app3_coupling_id).to.be.a('string');
    expect(app4_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    await httph.request('delete', `http://localhost:5000/apps/${app4}-pipline-test-space3/dynos`, init.alamo_headers, null);
    expect(await init.wait_for_app_content(`${app4}-pipline-test-space3`, 'pipeline1')).to.equal('pipeline1');
  });

  it('promote the second build', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app1_id } },
        targets: [{ app: { id: app2_id } }],
      }),
    ));
    expect(data.status).to.equal('successful');
    expect(data.id).to.be.a('string');
    expect(await init.wait_for_app_content(`${app2}-pipline-test-space1`, 'pipeline2')).to.equal('pipeline2');
    expect(await init.wait_for_app_content(`${app3}-pipline-test-space2`, 'pipeline1')).to.equal('pipeline1');
    expect(await init.wait_for_app_content(`${app4}-pipline-test-space3`, 'pipeline1')).to.equal('pipeline1');
  });

  it('promote the second build to the app3/app4', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app2_id } },
        targets: [{ app: { id: app3_id } }, { app: { id: app4_id } }],
      }),
    ));
    expect(data.status).to.equal('successful');
    expect(data.id).to.be.a('string');
    expect(await init.wait_for_app_content(`${app2}-pipline-test-space1`, 'pipeline2')).to.equal('pipeline2');
    expect(await init.wait_for_app_content(`${app3}-pipline-test-space2`, 'pipeline2')).to.equal('pipeline2');
    expect(await init.wait_for_app_content(`${app4}-pipline-test-space3`, 'pipeline2')).to.equal('pipeline2');
  });

  it('re-promote the first build', async () => {
    this.timeout(0);
    expect(pipeline1_release_id).to.be.a('string');
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    const data = JSON.parse(await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: {
          app: {
            id: app1_id,
            release: { id: pipeline1_release_id },
          },
        },
        targets: [{ app: { id: app2_id } }],
      }),
    ));

    expect(data.status).to.equal('successful');
    expect(data.id).to.be.a('string');
    expect(await init.wait_for_app_content(`${app1}-pipline-test-space1`, 'pipeline2')).to.equal('pipeline2');
    expect(await init.wait_for_app_content(`${app2}-pipline-test-space1`, 'pipeline1')).to.equal('pipeline1');
    expect(await init.wait_for_app_content(`${app3}-pipline-test-space2`, 'pipeline2')).to.equal('pipeline2');
    expect(await init.wait_for_app_content(`${app4}-pipline-test-space3`, 'pipeline2')).to.equal('pipeline2');
  });

  it('covers ensuring safe promotions halt if source config is different than dest config and its a safe promotion.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');

    await httph.request(
      'patch',
      `http://localhost:5000/apps/${app1_id}/config-vars`,
      init.alamo_headers,
      JSON.stringify({ TYPEAHEAD: 'WHONEEDSIT?' }),
    );
    try {
      await httph.request('post', 'http://localhost:5000/pipeline-promotions', { 'x-silent-error': true, ...init.alamo_headers },
        JSON.stringify({
          safe: true, pipeline: { id: pipeline_id }, source: { app: { id: app1_id } }, targets: [{ app: { id: app2_id } }],
        }));
    } catch (err) {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(422);
      expect(err.message.indexOf('Safe promotion was specified and this promotion has been deemed unsafe.') === 0).to.equal(true);
    }
  });

  it('covers ensuring promotions do not halt if source config is different than dest config and its an unsafe promotion.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app1_id } },
        targets: [{ app: { id: app2_id } }],
      }),
    );
  });

  it('covers ensuring promotions do not halt if config is same and its unsafe.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');

    await httph.request(
      'patch',
      `http://localhost:5000/apps/${app1_id}/config-vars`,
      init.alamo_headers,
      JSON.stringify({ TYPEAHEAD: null }),
    );
    await httph.request('post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app1_id } },
        targets: [{ app: { id: app2_id } }],
      }));
  });


  it('covers ensuring safe promotions halt if destination config is different then source config and its a safe promotion.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');

    await httph.request(
      'patch',
      `http://localhost:5000/apps/${app2_id}/config-vars`,
      init.alamo_headers,
      JSON.stringify({ TYPEAHEAD2: 'WHONEEDSIT?' }),
    );
    try {
      await httph.request('post', 'http://localhost:5000/pipeline-promotions', { 'x-silent-error': true, ...init.alamo_headers },
        JSON.stringify({
          safe: true, pipeline: { id: pipeline_id }, source: { app: { id: app1_id } }, targets: [{ app: { id: app2_id } }],
        }));
    } catch (err) {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(422);
      expect(err.message.indexOf('Safe promotion was specified and this promotion has been deemed unsafe.') === 0).to.equal(true);
    }
  });

  it('covers ensuring promotions do not halt if destination config is different than source config and its an unsafe promotion.', async () => {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    await httph.request(
      'post',
      'http://localhost:5000/pipeline-promotions',
      init.alamo_headers,
      JSON.stringify({
        pipeline: { id: pipeline_id },
        source: { app: { id: app1_id } },
        targets:
        [{ app: { id: app2_id } }],
      }),
    );
  });


  // TODO:
  // use case: pipeline prod end pipeline and ensure its failure.
  // use case: pipeline one app with no target, ensure its failure.
  // use case: try and release on a pipelined app, ensure its failure.
  // use case: rollback a pipelined app, ensure it succeeds.

  it('covers removing couplings.', async () => {
    expect(app1_coupling_id).to.be.a('string');
    await httph.request('delete', `http://localhost:5000/pipeline-couplings/${app1_coupling_id}`, init.alamo_headers, null);
  });

  it('covers being able to delete pipleines with active couplings', async () => {
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    await httph.request('delete', 'http://localhost:5000/pipelines/test-pipeline', init.alamo_headers);
  });

  // Ensure the pipeline coupling was removed after the pipeline was removed.
  it('covers ensuring deleting pipeline deletes pipeline couplings.', async () => {
    try {
      await httph.request(
        'get',
        `http://localhost:5000/pipeline-couplings/${app2_coupling_id}`,
        { 'x-silent-error': true, ...init.alamo_headers },
        null,
      );
    } catch (err) {
      expect(err.code).to.equal(404);
    }
  });

  it('removing multiple apps for pipelining (1).', async () => {
    await init.remove_app_if_exists(`${app1}-pipline-test-space1`);
  });

  it('removing multiple apps for pipelining (2).', async () => {
    await init.remove_app_if_exists(`${app2}-pipline-test-space1`);
  });

  it('removing multiple apps for pipelining (3).', async () => {
    await init.remove_app_if_exists(`${app3}-pipline-test-space2`);
  });

  it('removing multiple apps for pipelining (4).', async () => {
    await init.remove_app_if_exists(`${app4}-pipline-test-space3`);
  });
});
