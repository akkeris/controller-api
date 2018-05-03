const ngrok = require('ngrok')
const util = require('util')
const httph = require('../../lib/http_helper.js')
const alamo_headers = {"Authorization": process.env.AUTH_KEY, "User-Agent": "Hello", "x-username":"test", "x-elevated-access":"true"};

before(function(done) {
  if(process.env.NGROK_TOKEN) {
    let port = (process.env.PORT || 5000);
    ngrok.connect({authtoken:process.env.NGROK_TOKEN, addr:port}, function(err, url) {
      if(err) {
        console.error("ERROR: Unable to establish NGROK connection:", err);
      } else {
        process.env.TEST_CALLBACK = url
        process.env.ALAMO_APP_CONTROLLER_URL = url
      }
      let running_app = require('../../index.js')
      setTimeout(done, 500);
    })
  } else {

      let running_app = require('../../index.js')
    setTimeout(done, 500);
  }
})

after(function(done) {
  if(process.env.NGROK_TOKEN) {
    ngrok.disconnect()
    ngrok.kill()
  }
  done()
})

function wait(time) {
  return new Promise((resolve) => setTimeout(() => resolve(), time));
}

async function wait_for_app_content(url, content) {
  if(!url.startsWith('http')) {
    url = 'https://' + url + process.env.ALAMO_BASE_DOMAIN;
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

async function create_build(app, image, port) {
  if(port) {
    await httph.request('post', `http://localhost:5000/apps/${app.id}/formation`, alamo_headers, JSON.stringify({"size":"scout", "quantity":1, "type":"web", "command":null, "port":port}))
  }
  let build = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app.id}/builds`, alamo_headers, JSON.stringify({"org":"test", "checksum":"", "url":image}))); 
  return build
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

module.exports = {
  wait,
  wait_for_app_content,
  wait_for_build,
  create_test_app,
  create_app_content,
  delete_app,
  create_build,
  create_test_app_with_content
}