const ngrok = require('ngrok')
const util = require('util')
const httph = require('../../lib/http_helper.js')
const alamo_headers = {"Authorization": process.env.AUTH_KEY, "User-Agent": "Hello", "x-username":"test", "x-elevated-access":"true"};
let running_app = null

before(async function() {
  if(process.env.NGROK_TOKEN) {
    try {
      let port = (process.env.PORT || 5000);
      let url = await ngrok.connect({authtoken:process.env.NGROK_TOKEN, addr:port})
      process.env.TEST_CALLBACK = url
      process.env.ALAMO_APP_CONTROLLER_URL = url
      running_app = require('../../index.js')
    } catch (e) {
      console.error("ERROR: Unable to establish NGROK connection:", err);
    }
  } else {
    running_app = require('../../index.js')
  }
})

after(async function() {
  running_app.server.close(async () => {
    if(process.env.NGROK_TOKEN) {
      await ngrok.disconnect()
      await ngrok.kill()
    }
  });
})

function wait(time) {
  return new Promise((resolve) => setTimeout(() => resolve(), time));
}

async function wait_for_app_content(url, content, path) {
  if(!url.startsWith('http')) {
    url = 'https://' + url + process.env.ALAMO_BASE_DOMAIN;
  }
  if(path) {
    if(url[url.length - 1] === '/') {
      url = url + path
    } else {
      url = url + '/' + path
    }
  }
  process.stdout.write(`    ~ Waiting for ${url} to turn up`);
  for(let i = 0; i < 120; i++) {
    try {
      let data = await httph.request('get', url, {'X-Timeout':1500, 'x-silent-error':'true'}, null);
      if(content && data && data.indexOf(content) === -1) {
        throw new Error('Content could not be found.')
      }
      process.stdout.write("\n");
      return data
    } catch (e) {
      process.stdout.write(".");
      await wait(750);
    }
  }
  process.stdout.write("\n");
  throw new Error("Timeout waiting for app to turn up.");
}

async function wait_for_build(app, build_id) {
  process.stdout.write(`    ~ Waiting for build ${app} ${build_id}`);
  for(let i=0; i < 120; i++) {
    try {
      let build_info = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app}/builds/${build_id}`, alamo_headers, null));
      if(build_info.status === 'pending' || build_info.status === 'queued') {
        process.stdout.write(".");
      } else {
        process.stdout.write("\n");
        return build_info;
      }
    } catch (err) {
      if(err.code !== 423) {
        throw err;
      }
    }
    await wait(750);
  }
  process.stdout.write("\n");
  throw new Error("Timeout waiting for build to finish.");
}

async function create_test_app(space) {
  space = space || 'default';
  let app_name = "alamotest" + Math.floor(Math.random() * 10000)
  return JSON.parse(await httph.request('post', 'http://localhost:5000/apps', alamo_headers, JSON.stringify({org:"test", space, name:app_name})));
}

async function delete_app(app) {
  return await httph.request('delete', `http://localhost:5000/apps/${app.id}`, alamo_headers, null);
}

async function create_formation(app, type, command) {
  return await httph.request('post', `http://localhost:5000/apps/${app.id}/formation`, alamo_headers, JSON.stringify({"size":"scout", "quantity":1, "type":type, "command":command}))
}

async function create_build(app, image, port) {
  if(port) {
    await httph.request('post', `http://localhost:5000/apps/${app.id}/formation`, alamo_headers, JSON.stringify({"size":"scout", "quantity":1, "type":"web", "command":null, "port":port}))
  }
  let build = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app.id}/builds`, alamo_headers, JSON.stringify({"org":"test", "checksum":"", "url":image}))); 
  return build
}

async function create_addon(app, service, plan) {
  let plan_id = JSON.parse(await httph.request('get', `http://localhost:5000/addon-services/${service}/plans`, alamo_headers, null))
    .filter((x) => x.name === `${service}:${plan}`)[0].id
  return JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app.id}/addons`, alamo_headers, JSON.stringify({"plan":plan_id})));
}

async function is_running(app, type) {
  let dynos = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/dynos`, alamo_headers, null)).filter((x) => x.type === type)
  if (dynos.length === 0) {
    return false
  }
  return dynos[0].state.toLowerCase() === 'running'
}

async function wait(time) {
  await (new Promise((resolve, reject) => { setTimeout(function() { resolve() }, time)}))
}

async function wait_for_apptype(app, type) {
  process.stdout.write('    ~ Waiting for app to turn up ')
  for(let i=0; i < 200; i++) {
    await wait(1000)
    process.stdout.write('.')
    if (await is_running(app, 'worker')) {
      console.log()
      return
    }
  }
  console.log()
  throw new Error('failed waiting for app to turn up.')
}

async function delete_addon(app, addon) {
  return JSON.parse(await httph.request('delete', `http://localhost:5000/apps/${app.id}/addons/${addon.id}`, alamo_headers, null))
}

async function attach_addon(app, addon) {
  return JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app.id}/addon-attachments`, alamo_headers, JSON.stringify({"addon":addon.id, "app":app.id})))
}

async function detach_addon(app, addon) {
  return JSON.parse(await httph.request('delete', `http://localhost:5000/apps/${app.id}/addon-attachments/${addon.id}`, alamo_headers, null))
}

async function get_config_vars(app) {
  return JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app.id}/config-vars`, alamo_headers, null))
}

async function create_app_content(content, space, app) {
  await httph.request('patch', `http://localhost:5000/apps/${app.id}/config-vars`, alamo_headers, {"RETURN_VALUE":content});
  let build_info = await create_build(app, "docker://docker.io/akkeris/test-sample:latest", 2000);
  await wait_for_build(app.name, build_info.id);
  await wait_for_app_content(app.web_url, content);
  return Object.assign(app, {slug:build_info});
}

async function create_test_app_with_content(content, space) {
  let app = await create_test_app(space);
  return await create_app_content(content, space, app);
}

async function remove_app(app) {
  try {
    return JSON.parse(await httph.request('delete', `http://localhost:5000/apps/${app.id}`, alamo_headers, null))
  } catch (e) {
    console.error("Cannot remove test app:", app)
    console.error(e)
  }
}

module.exports = {
  wait,
  wait_for_apptype,
  is_running,
  create_formation,
  detach_addon,
  attach_addon,
  delete_addon,
  remove_app,
  get_config_vars,
  alamo_headers,
  wait,
  wait_for_app_content,
  wait_for_build,
  create_test_app,
  create_app_content,
  delete_app,
  create_build,
  create_addon,
  create_test_app_with_content
}