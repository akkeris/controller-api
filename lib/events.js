const common = require('./common.js');
const httph = require('./http_helper.js');
const logs = require('./log-drains.js');

// eslint-disable-next-line max-len
// const select_build_by_foreign_key = query.bind(query, fs.readFileSync('./sql/select_build_by_foreign_key.sql').toString('utf8'), (r) => r);

async function create(pg_pool, req, res /* regex */) {
  let payload = await httph.buffer_json(req);
  if (!payload.action || !payload.key) {
    throw new common.BadRequestError();
  }
  const app = await common.app_exists(pg_pool, payload.key);
  payload.app = {
    name: app.app_name,
    id: app.app_uuid,
  };
  payload.space = {
    name: app.space_name,
  };
  if (process.env.DEBUG === 'true') {
    console.log('[debug] received event: ', JSON.stringify(payload));
  }
  if (payload.action === 'released') {
    if (payload.release && payload.release.id) {
      try {
        const release = await common.release_exists(pg_pool, payload.app.id, payload.release.id);
        payload.release = {
          id: release.id,
          created_at: release.created.toISOString(),
          updated_at: release.updated.toISOString(),
          version: release.version,
        };
        if (release.build) {
          const build = await common.build_exists(pg_pool, release.build);
          payload.build = {
            id: build.build,
          };
          payload.slug.source_blob = {
            checksum: build.checksum,
            url: '',
            version: build.version,
            commit: build.sha,
            author: build.author,
            repo: build.repo,
            branch: build.branch,
            message: build.message,
          };
          payload.slug.id = build.build;
        }
        if (process.env.DEBUG === 'true') {
          console.log(`[debug] marking release as succeeded app_uuid: ${payload.app.id} release_id: ${payload.release.id}`);
        }
        await common.update_release_status(pg_pool, payload.app.id, payload.release.id, 'succeeded');
      } catch (e) {
        console.log('Error firing released event for: ', payload);
        console.log(e);
      }
    } else {
      console.error('Error: released event did not have a uuid attached:', payload);
    }
    logs.event(
      pg_pool,
      app.app_name,
      app.space_name,
      payload.release && payload.release.version ? `Release v${payload.release.version} finished.` : 'Release finished',
    );
    common.lifecycle.emit('released', payload);
  } else if (payload.action === 'crashed') {
    logs.event(
      pg_pool,
      app.app_name,
      app.space_name,
      `at=error dynos="${Array.isArray(payload.dynos) ? payload.dynos.map((x) => x.type).join(',') : 'unknown'}" code=${payload.code} desc="${payload.description}" restarts=${payload.restarts}`,
    );
  } else if (payload.action === 'security_scan') {
    // Make sure the payload conforms to the expected format
    // Must include status, service, and message. Can optionally include a link.
    if (!payload.status || !payload.service_name || !payload.message) {
      throw new common.BadRequestError('Payload must include status, service_name, and message.');
    }
    // Remove anything that isn't status, service, message, link, app info, etc.
    payload = {
      action: payload.action,
      key: payload.key,
      app: payload.app,
      space: payload.space,
      status: payload.status,
      service_name: payload.service_name,
      message: payload.message,
      ...'link' in payload && { link: payload.link },
    };
  } else if (payload.action === 'action_run_started') {
    // Make sure it is a valid action
    if (!payload.action_details || !payload.action_details.id || !payload.action_details.run) {
      throw new common.BadRequestError();
    }

    const action = await common.action_exists(pg_pool, app.app_uuid, payload.action_details.id);
    const action_run = await common.action_run_exists(pg_pool, payload.action_details.id, payload.action_details.run);
    // The apps-watcher doesn't know about the source event, so we need to add it here
    payload.source = action_run.source;

    // Update action run status to 'running'
    await common.update_action_run_status(
      pg_pool,
      action.action,
      payload.action_details.run,
      'running',
      null,
      payload.started_at,
    );
  } else if (payload.action === 'action_run_finished') {
    // Make sure it is a valid action
    if (!payload.action_details || !payload.action_details.id || !payload.action_details.run) {
      throw new common.BadRequestError();
    }

    const action = await common.action_exists(pg_pool, app.app_uuid, payload.action_details.id);
    const action_run = await common.action_run_exists(pg_pool, payload.action_details.id, payload.action_details.run);

    // The apps-watcher doesn't know about the source event, so we need to add it here
    payload.source = action_run.source;

    // Update action run status and include run metadata
    await common.update_action_run_status(
      pg_pool,
      action.action,
      payload.action_details.run,
      payload.success ? 'success' : 'failure',
      typeof payload.exit_code === 'number' ? payload.exit_code : parseInt(payload.exit_code, 10),
      payload.started_at,
      payload.finished_at,
    );

    // Tell region-api to clean up pod
    await common.alamo.oneoff_stop(pg_pool, app.space_name, app.app_name, action.formation.type);
  }

  common.notify_hooks(pg_pool, app.app_uuid, payload.action, JSON.stringify(payload), req.headers['x-username']);
  return httph.ok_response(res, JSON.stringify({ status: 'ok' }));
}

module.exports = {
  http: {
    create,
  },
};
