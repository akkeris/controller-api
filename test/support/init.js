const ngrok = require('ngrok');
const util = require('util'); // eslint-disable-line
const fs = require('fs');
const http = require('http');
const httph = require('../../lib/http_helper.js');

const alamo_headers = {
  Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
};
let running_app = null;

before(async function () {
  this.timeout(10000);
  if (process.env.NGROK_TOKEN) {
    try {
      const port = (process.env.PORT || 5000);
      const url = await ngrok.connect({ authtoken: process.env.NGROK_TOKEN, addr: port });
      process.env.TEST_CALLBACK = url;
      process.env.ALAMO_APP_CONTROLLER_URL = url;
      running_app = require('../../index.js');
      await running_app.ready;
    } catch (err) {
      console.error('ERROR: Unable to establish NGROK connection:', err);
    }
  } else {
    running_app = require('../../index.js');
    await running_app.ready;
  }
  process.on('exit', () => {
    running_app.server.close(async () => {
      if (process.env.NGROK_TOKEN) {
        await ngrok.disconnect();
        await ngrok.kill();
      }
    });
  })
});

after(async () => {});

function wait(time) {
  return new Promise((resolve) => setTimeout(() => resolve(), time));
}


async function remove_stale_apps() {
  try {
    await Promise.all(JSON.parse(await httph.request('get', `http://localhost:5000/apps`, alamo_headers, null))
      .filter((app) => app.key.startsWith('alamotest') || app.key.startsWith('altest') || app.key === 'pl1-pipline-test-space1' || app.key === 'pl2-pipline-test-space1' || app.key === 'pl1-pipline-test-space2' || app.key === 'pl4-pipline-test-space3' || app.space.name === 'preview')
      .map((app) => http.request('delete', `http://localhost:5000/apps/${app.key}`, alamo_headers, null)));
  } catch (e) {
    console.error('unable to remove applications during remove_stale_apps on the controller:')
    console.error(e)
  }
  try {
    await Promise.all(JSON.parse(await httph.request('get', `${process.env.MARU_STACK_API}/v1/space/default/apps`, alamo_headers, null))
      .filter((app) => app.appname.startsWith('alamotest') || app.appname.startsWith('altest') || (app.appname === 'pl1' && app.space === 'pipline-test-space1') || (app.appname === 'pl2' && app.space === 'pipline-test-space1') || (app.appname === 'pl1' && app.space === 'pipline-test-space2') || (app.appname === 'pl4' && app.space === 'pipline-test-space3') || app.space === 'preview')
      .map((app) => [
        http.request('delete', `${process.env.MARU_STACK_API}/v1/config/set/${app.key}`, alamo_headers, null),
        http.request('delete', `${process.env.MARU_STACK_API}/v1/space/app/${app.key}`, alamo_headers, null),
        http.request('delete', `${process.env.MARU_STACK_API}/v1/app/${app.key}`, alamo_headers, null),
      ]));
  } catch (e) {
    console.error('unable to remove applications during remove_stale_apps on the region api:')
    console.error(e)
  }
}

async function wait_for_app_content(url, content, path, headers) {
  if (!url) {
    throw new Error(`The passed in url for wait_for_app_content was bunk! ${url}`);
  }
  if (!url.startsWith('http')) {
    const urltmp = url;
    if (urltmp.endsWith('-default')) {
      url = urltmp.substring(0, urltmp.indexOf('-default'));
    }
    url = `https://${url}${process.env.ALAMO_BASE_DOMAIN}`;
  }
  if (path) {
    if (url[url.length - 1] === '/') {
      url += path;
    } else {
      url = `${url}/${path}`;
    }
  }
  process.stdout.write(`    ~ Waiting for ${url} to turn up`);
  for (let i = 0; i < 210; i++) {
    try {
      if (headers) {
        headers = Object.assign(headers, { 'X-Timeout': 1500, 'x-silent-error': 'true' });
      } else {
        headers = { 'X-Timeout': 1500, 'x-silent-error': 'true' };
      }
      // eslint-disable-next-line no-await-in-loop
      const data = await httph.request('get', url, headers, null);

      if(process.env.TEST_WAIT_FOR_APP_CONTENT == "true") {
        console.log('\nFound:', data)
      }
      if (content && data && data.indexOf(content) === -1) {
        throw new Error('Content could not be found.');
      }
      process.stdout.write('\n');
      return data;
    } catch (e) {
      if(process.env.TEST_WAIT_FOR_APP_CONTENT == "true") {
        console.log('\nError:',e)
      }
      process.stdout.write('.');
      // eslint-disable-next-line no-await-in-loop
      await wait(750);
    }
  }
  process.stdout.write('\n');
  throw new Error('Timeout waiting for app to turn up.');
}

async function wait_for_build(app, build_id) {
  if (app.name && app.name.includes('-')) {
    app = app.name;
  }
  if (app.id) {
    app = app.id;
  }
  if (build_id.id) {
    build_id = build_id.id;
  }
  process.stdout.write(`    ~ Waiting for build ${app} ${build_id}`);
  for (let i = 0; i < 210; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const build_info = JSON.parse(await httph.request(
        'get',
        `http://localhost:5000/apps/${app}/builds/${build_id}`,
        alamo_headers,
        null,
      ));
      if (build_info.status === 'pending' || build_info.status === 'queued') {
        process.stdout.write('.');
      } else if (build_info.status === 'succeeded') {
        process.stdout.write('\n');
        return build_info;
      } else {
        process.stdout.write(' - build failed:\n');
        console.log(await httph.request(
          'get',
          `http://localhost:5000/apps/${app}/builds/${build_id}/result`,
          alamo_headers,
          null,
        ))
        throw new Error('build failed')
      }
    } catch (err) {
      if (err.code !== 423) {
        throw err;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await wait(750);
  }
  process.stdout.write('\n');
  throw new Error('Timeout waiting for build to finish.');
}

async function create_test_app(space = 'default', name = `alamotest${Math.floor(Math.random() * 100000)}`, port) {
  let app = JSON.parse(await httph.request(
    'post',
    'http://localhost:5000/apps',
    alamo_headers,
    JSON.stringify({ org: 'test', space, name }),
  ));
  if(port) {
    create_formation(app, 'web', null, port);
  }
  return app;
}

async function delete_app(app) {
  try {
    return await httph.request('delete', `http://localhost:5000/apps/${app.id}`, alamo_headers, null);
  } catch (e) {
    console.error('UNABLE TO REMOVE APP, WE MAY HAVE LEAKED RESOURCES:');
    console.error(app);
    console.error(e);
  }
  return undefined;
}

async function create_formation(app, type = 'worker', command = 'none', port = null) {
  return httph.request('post', `http://localhost:5000/apps/${app.id}/formation`, alamo_headers, JSON.stringify({
    size: 'gp1', quantity: 1, type, command, port,
  }));
}

async function update_formation(app, type = 'worker', command = 'none', port = null) {
  return httph.request('patch', `http://localhost:5000/apps/${app.id}/formation`, alamo_headers, JSON.stringify([{
    size: 'gp1', quantity: 1, type, command, port,
  }]));
}

async function create_build(app, image, port /* checksum, sha, org, repo, branch, version */) {
  if (port) {
    await httph.request('post', `http://localhost:5000/apps/${app.id}/formation`, alamo_headers, JSON.stringify({
      size: 'gp1', quantity: 1, type: 'web', command: null, port,
    }));
  }
  return JSON.parse(await httph.request(
    'post',
    `http://localhost:5000/apps/${app.id}/builds`,
    alamo_headers,
    JSON.stringify({ org: 'test', checksum: '', url: image }),
  ));
}

async function create_fake_formation(app) {
  return JSON.parse(await httph.request(
    'post',
    `http://localhost:5000/apps/${app.id}/formation`,
    alamo_headers,
    JSON.stringify({
      type: 'web', command: 'what', quantity: 1, size: 'gp1', healthcheck: '/what',
    }),
  ));
}

async function fake_github_notice(app, pr_file) {
  const git = require('../../lib/git.js');
  const incoming = fs.readFileSync(pr_file).toString('utf8');
  const hash = git.calculate_hash('testing', incoming);
  const headers = { 'x-github-event': 'pull_request', 'x-hub-signature': hash };
  return httph.request(
    'post',
    `http://localhost:5000/apps/${app.id}/builds/auto/github`,
    Object.assign(headers, alamo_headers), incoming,
  );
}

async function get_previews(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/previews`, alamo_headers, null));
}

async function create_addon(app, service, plan, name) {
  const plan_id = JSON.parse(await httph.request(
    'get',
    `http://localhost:5000/addon-services/${service}/plans`,
    alamo_headers,
    null,
  ))
    .filter((x) => x.name === `${service}:${plan}`)[0].id;
  const payload = { plan: plan_id };
  if (name) {
    payload.attachment = { name };
  }
  return JSON.parse(await httph.request(
    'post',
    `http://localhost:5000/apps/${app.id}/addons`,
    alamo_headers,
    JSON.stringify(payload),
  ));
}

async function get_app(app) {
  if (app.id) {
    app = app.id;
  }
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app}`, alamo_headers, null));
}

async function get_dynos(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/dynos`, alamo_headers, null));
}

async function is_running(app, type) {
  const dynos = (await get_dynos(app)).filter((x) => x.type === type);
  if (dynos.length === 0) {
    return false;
  }
  return dynos[0].state.toLowerCase() === 'running';
}

async function wait_for_apptype(app /* type */) {
  process.stdout.write('    ~ Waiting for app to turn up ');
  for (let i = 0; i < 200; i++) {
    // eslint-disable-next-line no-await-in-loop
    await wait(1000);
    process.stdout.write('.');
    // eslint-disable-next-line no-await-in-loop
    if (await is_running(app, 'worker')) {
      console.log();
      return;
    }
  }
  console.log();
  throw new Error('failed waiting for app to turn up.');
}

async function delete_addon(app, addon) {
  return JSON.parse(await httph.request(
    'delete',
    `http://localhost:5000/apps/${app.id}/addons/${addon.id}`,
    alamo_headers,
    null,
  ));
}

async function attach_addon(app, addon) {
  return JSON.parse(await httph.request(
    'post',
    `http://localhost:5000/apps/${app.id}/addon-attachments`,
    alamo_headers,
    JSON.stringify({ addon: addon.id, app: app.id }),
  ));
}

async function detach_addon(app, addon) {
  return JSON.parse(await httph.request(
    'delete',
    `http://localhost:5000/apps/${app.id}/addon-attachments/${addon.id}`,
    alamo_headers,
    null,
  ));
}

async function get_config_vars(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/config-vars`, alamo_headers, null));
}

async function update_config_vars(app, config) {
  return JSON.parse(await httph.request(
    'patch',
    `http://localhost:5000/apps/${app.id}/config-vars`,
    alamo_headers,
    JSON.stringify(config),
  ));
}

async function create_space(name, description) {
  try {
    await httph.request(
      'post',
      'http://localhost:5000/spaces',
      { 'x-silent-error': true, ...alamo_headers },
      JSON.stringify({ name, description }),
    );
  } catch (e) {
    // do nothing
  }
}

async function get_metrics(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/metrics`, alamo_headers, null));
}

async function create_test_build(app) {
  await httph.request('patch', `http://localhost:5000/apps/${app.id}/config-vars`, alamo_headers, { RETURN_VALUE: 'TESTING' });
  return create_build(app, 'docker://docker.io/akkeris/test-sample:latest', 2000);
}

async function create_app_content(content, space, app) {
  await httph.request('patch', `http://localhost:5000/apps/${app.id}/config-vars`, alamo_headers, { RETURN_VALUE: content });
  const build_info = await create_build(app, 'docker://docker.io/akkeris/test-sample:latest', 2000);
  await wait_for_build(app.name, build_info.id);
  await wait_for_app_content(app.web_url, content);
  return Object.assign(app, { slug: build_info });
}

async function enable_feature(app, feature) {
  await httph.request('patch', `http://localhost:5000/apps/${app.id}/features/${feature}`, alamo_headers, { enabled: true }, null);
}

async function disable_feature(app, feature) {
  await httph.request('patch', `http://localhost:5000/apps/${app.id}/features/${feature}`, alamo_headers, { enabled: false }, null);
}

async function addon_info(app, addon) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/addons/${addon.id}`, alamo_headers, null));
}

async function latest_release(app) {
  if (app.id) {
    app = app.id;
  }
  const releases = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app}/releases`, alamo_headers, null));
  return releases.reduce((acc, cur /* index, src */) => {
    if (acc.version < cur.version) return cur;
    return acc;
  }, { version: 0 });
}

async function create_test_app_with_content(content, space) {
  const app = await create_test_app(space);
  return create_app_content(content, space, app);
}

async function remove_app(app) {
  try {
    return JSON.parse(await httph.request('delete', `http://localhost:5000/apps/${app.id}`, alamo_headers, null));
  } catch (e) {
    console.error('Cannot remove test app:', app);
    console.error(e);
  }
  return undefined;
}

async function remove_app_if_exists(app) {
  if (app.id) {
    app = app.id;
  }
  try {
    await httph.request('delete', `http://localhost:5000/apps/${app}`, { 'x-silent-error': true, ...alamo_headers }, null);
  } catch (e) {
    // don't care.
  }
}

async function remove_pipeline_if_exists(pipeline) {
  try {
    await httph.request(
      'delete',
      `http://localhost:5000/pipelines/${pipeline}`,
      { 'x-silent-error': true, ...alamo_headers },
      null,
    );
  } catch (e) {
    // don't care.
  }
}


async function remove_site(site) {
  try {
    return JSON.parse(await httph.request('delete', `http://localhost:5000/sites/${site.id}`, alamo_headers, null));
  } catch (e) {
    console.error('Cannot remove test site:', site);
    console.error(e);
  }
  return undefined;
}

async function add_hook(app, url, events, secret, active) {
  if (typeof (active) === 'undefined' || active === null) {
    active = true;
  }
  const hook_payload = JSON.stringify({
    url,
    events,
    active: true,
    secret,
  });
  return JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app.id}/hooks`, alamo_headers, hook_payload));
}

async function update_hook(app, hook_id, url, active) {
  if (typeof (active) === 'undefined' || active === null) {
    active = true;
  }
  return JSON.parse(await httph.request(
    'patch',
    `http://localhost:5000/apps/${app.id}/hooks/${hook_id}`,
    alamo_headers,
    JSON.stringify({ url, active }),
  ));
}

async function get_hook_results(app, hook_id) {
  return httph.request('get', `http://localhost:5000/apps/${app.id}/hooks/${hook_id}/results`, alamo_headers, null);
}

async function get_hook(app, hook_id) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/hooks/${hook_id}`, alamo_headers, null));
}

async function get_hooks(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/hooks`, alamo_headers, null));
}

async function remove_hook(app, hook_id) {
  return httph.request('delete', `http://localhost:5000/apps/${app.id}/hooks/${hook_id}`, alamo_headers, null);
}

async function create_test_site() {
  const site_name = `alamotest${Math.floor(Math.random() * 10000)}${process.env.BASE_DOMAIN || process.env.BASE_DOMAIN}`;
  return JSON.parse(await httph.request('post', 'http://localhost:5000/sites', alamo_headers, JSON.stringify({ domain: site_name })));
}

async function add_to_site(site, app, source, target) {
  return JSON.parse(await httph.request('post', 'http://localhost:5000/routes', alamo_headers, JSON.stringify({
    site: site.id, app: app.id, target_path: target, source_path: source,
  })));
}

async function setup_auto_build(app, repo, branch, username, token) {
  await httph.request('post', `http://localhost:5000/apps/${app.id}/builds/auto`, alamo_headers, JSON.stringify({
    repo, branch, status_check: 'true', auto_deploy: 'true', username, token,
  }));
  await enable_feature(app, 'auto-release');
}

async function get_routes(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/routes`, alamo_headers, null));
}

function create_callback_server(port = 8001) {
  let hook_data = null;
  const hook_listener = http.createServer((req, res) => {
    let y = Buffer.alloc(0);
    req.on('data', (x) => { y = Buffer.concat([y, x]); });
    req.on('end', () => { hook_data = JSON.parse(y.toString('utf8')); });
    res.end();
  }).on('clientError', (err /* socket */) => console.error('client socket error:', err));
  hook_listener.wait_for_callback = async function (type, desc) {
    process.stdout.write(`    ~ Waiting for ${type} hook ${desc}`);
    for (let i = 0; i < 1200; i++) {
      if (i % 10 === 0) {
        process.stdout.write('.');
      }
      if (hook_data !== null && hook_data.action === type) {
        const hd = hook_data;
        hook_data = null;
        process.stdout.write('\n');
        return hd;
      } if (hook_data !== null && hook_data.action !== type) {
        hook_data = null;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100));
    }
    process.stdout.write('\n');
    throw new Error('Did not receive data from hook, waited for 60 seconds.');
  };
  hook_listener.listen(port);
  return hook_listener;
}

module.exports = {
  get_dynos,
  create_space,
  get_metrics,
  remove_pipeline_if_exists,
  remove_app_if_exists,
  alamo_headers,
  get_app,
  create_callback_server,
  get_hook_results,
  create_test_build,
  update_formation,
  add_hook,
  get_hooks,
  get_hook,
  update_hook,
  remove_hook,
  get_routes,
  create_fake_formation,
  get_previews,
  fake_github_notice,
  wait,
  add_to_site,
  create_test_site,
  remove_site,
  enable_feature,
  disable_feature,
  wait_for_apptype,
  is_running,
  create_formation,
  detach_addon,
  attach_addon,
  delete_addon,
  addon_info,
  remove_app,
  get_config_vars,
  update_config_vars,
  wait_for_app_content,
  wait_for_build,
  create_test_app,
  create_app_content,
  latest_release,
  delete_app,
  create_build,
  create_addon,
  create_test_app_with_content,
  setup_auto_build,
};
