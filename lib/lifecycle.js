const assert = require('assert');
const fs = require('fs');
const common = require('./common.js');
const logs = require('./log-drains.js');
const query = require('./query.js');

// public
const select_latest_image = query.bind(query, fs.readFileSync('./sql/select_latest_image.sql').toString('utf8'), (r) => r);
async function restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org_name, why) {
  const formations = await common.formations_exists(pg_pool, app_uuid);
  if (why) {
    logs.event(pg_pool, app_name, space_name, `Restarting (${why})`);
  }

  if (formations.length === 0) {
    if (process.env.DEBUG) {
      console.log(`No formations found for ${app_uuid}, not restarting.`);
    }
    // If there's no apps running, don't bother restarting.
    return;
  }
  const space = await common.space_exists(pg_pool, space_name);
  const internal = space.tags.split(',').filter((x) => x.startsWith('compliance=')).map((x) => x.replace('compliance=', '')).includes('internal');
  const production = space.tags.split(',').filter((x) => x.startsWith('compliance=')).map((x) => x.replace('compliance=', '')).includes('prod');
  const socs = space.tags.split(',').filter((x) => x.startsWith('compliance=')).map((x) => x.replace('compliance=', '')).includes('socs');
  let release = {};

  try {
    release = await common.latest_release(pg_pool, app_uuid);
  } catch (e) {
    if (process.env.DEBUG) {
      console.log(`Attempting to get latest release failed for ${app_uuid}: ${e}`);
    }
    if (!(e instanceof common.NotFoundError)) {
      throw e;
    }
    // If there are no releases, go ahead and abort any sort of restart.
    return;
  }

  assert.ok(release.release, 'Unable to find the latest release in order to deploy this app!.');
  const labels = {
    'akkeris.io/app-uuid': app_uuid,
    'akkeris.io/internal': internal ? 'true' : 'false',
    'akkeris.io/production': production ? 'true' : 'false',
    'akkeris.io/socs': socs ? 'true' : 'false',
    'akkeris.io/release-uuid': release.release,
  };
  let image = await select_latest_image(pg_pool, [app_uuid]);
  if (image.length === 0) {
    return;
  }
  [image] = image;

  image = common.registry_image(
    image.build_org_name,
    image.build_app_name,
    image.build_app,
    image.foreign_build_key,
    image.foreign_build_system,
  );

  for (let i = 0; i < formations.length; i++) {
    const form = formations[i];
    // eslint-disable-next-line no-await-in-loop
    await common.alamo.deploy(
      pg_pool,
      space_name,
      app_name,
      form.type,
      image,
      form.command,
      form.port,
      form.healthcheck,
      // eslint-disable-next-line no-await-in-loop
      await common.deployment_features(
        pg_pool,
        app_uuid,
        form.type,
      ),
      labels,
      // eslint-disable-next-line no-await-in-loop
      await common.deployment_filters(
        pg_pool,
        app_uuid,
        form.type,
      ),
    );
  }
}
// See below.
module.exports = {
  restart_and_redeploy_app,
};
