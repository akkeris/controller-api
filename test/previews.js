
"use strict"

describe("preview apps: ensure preview apps work appropriately", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";
  process.env.TEST_MODE = "true"
  const init = require('./support/init.js');
  const fs = require('fs')
  const httph = require('../lib/http_helper.js')
  const git = require('../lib/git.js')
  const expect = require("chai").expect
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "x-username":"test", "x-elevated-access":"true"}
  const app_dummy_name = "altest" + Math.round(Math.random() * 10000)
  const app_name = "altestingapp" + Math.round(Math.random() * 10000)
  const site_name = "altestingapp" + Math.round(Math.random() * 10000) + process.env.SITE_BASE_DOMAIN


  const webhook_pr_push_before_pr = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-push-before-pr.json').toString('utf8'))
  const webhook_pr_opened = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-opened.json').toString('utf8'))
  const webhook_pr_opened_to_wrong_branch = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-opened-to-wrong-branch.json').toString('utf8'))
  const webhook_pr_second_push_on_pr = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-second-push-on-pr.json').toString('utf8'))
  const webhook_pr_syncronize = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-syncronize.json').toString('utf8'))
  const webhook_pr_closed = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-closed.json').toString('utf8'))
  // commit shows on refs/master or destination branch.
  const webhook_pr_push_when_closed = JSON.parse(fs.readFileSync('./test/support/github-webhook-pr-push-when-closed.json').toString('utf8'))

  let addon_attach = null
  if(process.env.SMOKE_TESTS) {
    it("setup dummy app", async () => {
      let req_data = JSON.stringify({org:"test", space:"preview", name:app_dummy_name, size:"scout", quantity:1, "type":"web", port:9000})
      let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, req_data)
      addon_attach = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app_dummy_name}-preview/addons`, alamo_headers, JSON.stringify({"plan":"amazon-s3:basic"})))
    })
  }

  it("setup an app", async () => {
    let req_data = JSON.stringify({org:"test", space:"preview", name:app_name, size:"constellation", quantity:1, "type":"web", port:9000})
    let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, req_data)
    await httph.request('patch', `http://localhost:5000/apps/${app_name}-preview/config-vars`, alamo_headers, JSON.stringify({FOO:"GAZI"}))
  })
  
  it("setup an auto build", async () => {
    let req_data = JSON.stringify({repo:"https://github.com/akkeris/preview-app-test-repo", branch:"master", status_check:"true", auto_deploy:"true", username:"test", token:"ab832239defaa3298438abb"})
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto`, alamo_headers, req_data)
    data = JSON.parse(data.toString())
    expect(data.status).to.equal("successful")
  })

  it("setup auto releases", async () => {
    let result = await httph.request('patch', `http://localhost:5000/apps/${app_name}-preview/features/auto-release`, alamo_headers, {"enabled":true}, null)  
  })

  it("setup a build and release", async function() {
    this.timeout(0)
    let build_payload = {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756","url":"data:base64,UEsDBBQAAAAIAMRy+0gi9l2EawAAAIUAAAAKABwARG9ja2VyZmlsZVVUCQAD7xeZV+8XmVd1eAsAAQSKPdBdBEafakZzC/L3VcjLT0m1SixKz8/jCgr1U8jNTsksUtAtUNAvLS7SLy5K1k8sKOAK9w/ydvEMQhV09g+IVNBDFQMZkVeQq5CZV1ySmJPD5RoR4B/sqmBqYGDA5ezrohCtoASUVtJRUALKF5UoKcQCAFBLAwQUAAAACAAAc/tILLDUr7IAAAAHAQAACAAcAGluZGV4LmpzVVQJAANgGJlXYhiZV3V4CwABBIo90F0ERp9qRlVPvQrCQAze+xTB5VIo9So6SR0EoaNoxy7lGmix3Gku6lB8d+8qiA6BfH/5iHHWC/QiVyiB6XYfmFBFrNJtkphZ9sQP4mCIfG6YWqHzzCGGTBaCPoVyB1MCcc+fPAhV1Ha40jqD6RVu/Si46Gkc3eLLku0wgGj7dOXOojLjQFYOzI5VBkjMGXhnLiTfsg+c86qq6+OyyAtYaw37toNTeIe8NNzYOOq/YRy8kMWN1jrdvgFQSwMEFAAAAAgA6nv7SEmwHUOYAAAA6QAAAAwAHABwYWNrYWdlLmpzb25VVAkAAycomVcpKJlXdXgLAAEEij3QXQRGn2pGVY+7DoMwDEV3vsLywFQhWFmrDp27skSJK1yVhMYBIRD/3iQgVR19zvVrKwDQqoGwBfxMvK4keElwJi/sbOJNVVf1QQ2J9jyG0xxwUJwrtoaW6nUOOIISxRbLBILyIeWsMwR/4WgDSZakewcd3rx3vgXrIAmQkTQ/mUyHUJZACwdoMHbueZeaQu/876I3a7KSn7o/rljsxRdQSwECHgMUAAAACADEcvtIIvZdhGsAAACFAAAACgAYAAAAAAABAAAApIEAAAAARG9ja2VyZmlsZVVUBQAD7xeZV3V4CwABBIo90F0ERp9qRlBLAQIeAxQAAAAIAABz+0gssNSvsgAAAAcBAAAIABgAAAAAAAEAAACkga8AAABpbmRleC5qc1VUBQADYBiZV3V4CwABBIo90F0ERp9qRlBLAQIeAxQAAAAIAOp7+0hJsB1DmAAAAOkAAAAMABgAAAAAAAEAAACkgaMBAABwYWNrYWdlLmpzb25VVAUAAycomVd1eAsAAQSKPdBdBEafakZQSwUGAAAAAAMAAwDwAAAAgQIAAAAA"};
    let build_info_new = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds`, alamo_headers, JSON.stringify(build_payload)))
    let building_info_new = await init.wait_for_build(app_name + '-preview', build_info_new.id)
    await init.wait_for_app_content(app_name + '-preview', 'hello')
  })

  it("setup the formation", async () => {
    let data = JSON.parse(await httph.request('patch', `http://localhost:5000/apps/${app_name}-preview/formation`, alamo_headers, JSON.stringify([{"type":"web","command":"what", "quantity":2, "size":"constellation", "healthcheck":"/what"}])))
    expect(data.length).to.equal(1)
    expect(data[0].command).to.equal("what")
    expect(data[0].quantity).to.equal(2)
    expect(data[0].size).to.equal("constellation")
    expect(data[0].healthcheck).to.equal("/what")
  })

  it("setup site", async () => {
    await httph.request('post', `http://localhost:5000/sites`, alamo_headers, JSON.stringify({"domain":site_name}))
    await httph.request('post', `http://localhost:5000/routes`, alamo_headers, JSON.stringify({"site":site_name, "app":app_name + '-preview', "target_path":"/", "source_path":"/"}))
  })

  it("setup a sharable (and attached) addon", async () => {
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/addons`, alamo_headers, JSON.stringify({"plan":"akkeris-postgresql:hobby"}))
    if(process.env.SMOKE_TESTS) {
      let attach = await httph.request('post', `http://localhost:5000/addon-attachments`, alamo_headers, JSON.stringify({"app":`${app_name}-preview`, "addon":addon_attach.id}))
    }
  })

  it("setup an a non-sharable addon (non vault based)", async () => {
    await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/addons`, alamo_headers, JSON.stringify({"plan":"papertrail:basic"}))
    let drains = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/log-drains`, alamo_headers, null))
    expect(drains).to.be.an('array')
    expect(drains.length).to.equal(1)    
  })

  it("ensure a PR request with feature disabled does not create a preview app", async () => {
    let incoming = JSON.stringify(webhook_pr_opened)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'pull_request', 'x-hub-signature':hash}
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
  })

  it("ensure we can enable preview apps", async () => {
    let result = await httph.request('patch', `http://localhost:5000/apps/${app_name}-preview/features/preview`, alamo_headers, {"enabled":true}, null)
    result = JSON.parse(result)
    let result_sites = await httph.request('patch', `http://localhost:5000/apps/${app_name}-preview/features/preview-sites`, alamo_headers, {"enabled":true}, null)
    result_sites = JSON.parse(result_sites)
    expect(result).be.an('object')
    expect(result.enabled).to.equal(true)
    expect(result_sites).be.an('object')
    expect(result_sites.enabled).to.equal(true)
  })

  it("ensure a PR request targeted at the wrong destination branch does not cause a preview app", async () => {
    let incoming = JSON.stringify(webhook_pr_opened_to_wrong_branch)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'pull_request', 'x-hub-signature':hash}
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(data.toString('utf8')).to.equal('This webhook took place on a branch that isnt of interest.')
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
  })

  it("ensure a PR request updated at the wrong destination branch does not cause a preview app", async () => {
    let incoming = JSON.stringify(webhook_pr_push_before_pr)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'push', 'x-hub-signature':hash}
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(data.toString('utf8')).to.equal('This webhook took place on a branch that isnt of interest.')
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
  })

  let preview_app = null
  it("ensure a PR request to the correct branch, while enabled, creates a preview app", async function() {
    this.timeout(120000)
    let incoming = JSON.stringify(webhook_pr_opened)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'pull_request', 'x-hub-signature':hash}
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
    preview_app = previews[0]
  })

  it("ensure new preview app received config vars correctly", async () => {
    for(let i=0; i < 20; i++) {
      let config_vars = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/config-vars`, alamo_headers, null))
      if(config_vars["FOO"]) {
        expect(config_vars["FOO"]).to.equal("GAZI")
        return
      }
      await (new Promise((res) => { setTimeout(()=> { res() }, 1000) })) // wait one second... asyncronously.
    }
    expect(true).to.equal(false)
  })

  it("covers audit events for a preview app", (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app=' + app_name + '&space=preview', alamo_headers, null,
      (err, data) => {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.some((x)=> x.action === 'preview')).to.eql(true);
        done();
    });
    }, 5000);
  });

  it("ensure quantity on formation is 1, but all other settings are the same", async () => {
    let data = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/formation`, alamo_headers, null))
    expect(data.length).to.equal(1)
    expect(data[0].type).to.equal("web")
    expect(data[0].command).to.equal("what")
    expect(data[0].quantity).to.equal(1)
    expect(data[0].size).to.equal("constellation")
    expect(data[0].healthcheck).to.equal("/what")
  })

  it("ensure new preview app received new addon that could not be shared", async () => {
    for(let i=0; i < 10; i++) {
      let preview_addons = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/addons`, alamo_headers, null))
      if(preview_addons.length === 1) {
        let source_addons = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/addons`, alamo_headers, null))
        expect(preview_addons[0].addon_service.name).to.equal('papertrail')
        expect(preview_addons[0].plan.name).to.equal('papertrail:basic')
        let source_addon = source_addons.filter((x) => x.addon_service.name === 'papertrail')
        expect(source_addon.length).to.equal(1)
        expect(source_addon.name).to.not.equal(preview_addons[0].name)
        return
      }
      await (new Promise((res) => { setTimeout(()=> { res() }, 1000) })) // wait one second... asyncronously.
    }
    expect(true).to.equal(false)
  })

  it("ensure they both have the same drain end point", async () => {
    let drains = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/log-drains`, alamo_headers, null))
    expect(drains).to.be.an('array')
    expect(drains.length).to.equal(1)
    let preview_drains = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/log-drains`, alamo_headers, null))
    expect(preview_drains).to.be.an('array')
    expect(preview_drains.length).to.equal(1)
    expect(preview_drains[0].url).to.equal(drains[0].url)
  })

  it("ensure new preview app attaches sharable addons, rather than creating a new one", async () => {
    let attachments = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/addon-attachments`, alamo_headers, null))
    let addons = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/addons`, alamo_headers, null))
    addons = addons.filter((x) => x.addon_service.name === 'akkeris-postgresql')
    expect(addons.length).to.equal(1)
    attachments = attachments.filter((x) => x.addon.id === addons[0].id)
    expect(attachments.length).to.equal(1)
  })

  it("ensure new preview app has auto build setup on PR branch", async () => {
    let auto_build = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/builds/auto/github`, alamo_headers, null))
    expect(auto_build.branch).to.equal(webhook_pr_opened.pull_request.head.ref)
  })

  it("ensure a new site with same routes are created", async () => {
    let routes = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/routes`, alamo_headers, null))
    expect(routes.length).to.equal(1)
    expect(routes[0].app.id).to.equal(preview_app.app.id)
    expect(routes[0].source_path).to.equal('/')
    expect(routes[0].target_path).to.equal('/')
  })

  if(process.env.SMOKE_TESTS) {
    it("ensure new preview app attaches source addon-attachments, as an attachment", async () => {
      let attachments = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/addon-attachments`, alamo_headers, null))
      attachments = attachments.filter((x) => x.addon.plan.name === 'amazon-s3:basic')
      expect(attachments.length).to.equal(1)
      expect(attachments[0].addon.app.name).to.equal(addon_attach.app.name)
    })
  }

  it("ensure a push to the existing PR causes a new build on the preview app (not the source app)", async () => {
    // Ensure first we have at least one build running.
    let data = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/builds`, alamo_headers, null))
    expect(data.length).to.equal(1)

    // Send second hook
    let incoming = JSON.stringify(webhook_pr_second_push_on_pr)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'push', 'x-hub-signature':hash}
    let datam = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(datam.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')

    // Ensure two builds are running on the preview app
    let builds2 = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/builds`, alamo_headers, null))
    expect(builds2.length).to.equal(2)


    // Ensure theres only one build for the original app (e.g., we didn't accidently create a built on the source app)
    let builds3 = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/builds`, alamo_headers, null))
    expect(builds3.length).to.equal(1)
  })

  function check_preview_app(obj) {
    expect(obj.id).to.be.a('string')
    expect(obj.app).to.be.an('object')
    expect(obj.app.id).to.be.a('string')
    expect(obj.source.app).to.be.an('object')
    expect(obj.source.app.id).to.be.a('string')
    expect(obj.source["app-setup"]).to.be.an('object')
    expect(obj.source["app-setup"].id).to.be.a('string')
    expect(obj.source.trigger.type).to.be.a('string')
    expect(obj.source.trigger.id).to.be.a('string')
    expect(obj.created_at).to.be.a('string')
    expect(obj.updated_at).to.be.a('string')
  }

  let preview_id = null
  it("ensure we can list previews from source application", async () => {
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
    previews.forEach(check_preview_app)
    preview_id = previews[0].id
  })

  it("ensure we can get a preview from a source application", async () => {
    let preview = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews/${preview_id}`, alamo_headers, null))
    check_preview_app(preview)
  })

  it("ensure we can disable preview apps", async () => {
    let result = await httph.request('patch', `http://localhost:5000/apps/${app_name}-preview/features/preview`, alamo_headers, {"enabled":false}, null)
    result = JSON.parse(result)
    expect(result).be.an('object')
    expect(result.enabled).to.equal(false)
  })

  it("ensure (even after preview apps are disabled) preview apps are still listable (and not deleted)", async () => {
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
  })

  it("ensure a push to the existing PR creates build after preview apps were disabled.", async () => {
    this.timeout(120000)
    let incoming = JSON.stringify(webhook_pr_second_push_on_pr)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'push', 'x-hub-signature':hash}
    let datam = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(datam.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    // Ensure three builds are running on the preview app even after previews are disabled.
    let builds = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${preview_app.app.id}/builds`, alamo_headers, null))
    expect(builds.length).to.equal(3)
  })

  it("ensure a PR request to the correct branch, while disabled (after being enabled), does not create a preview app", async () => {
    let incoming = JSON.stringify(webhook_pr_opened)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'pull_request', 'x-hub-signature':hash}
    let data = await httph.request('post', `http://localhost:5000/apps/${app_name}-preview/builds/auto/github`, headers, incoming)
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await httph.request('get', `http://localhost:5000/apps/${app_name}-preview/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
  })

  let prod_app_name = app_name.substring(0, app_name.length - 1) + 'p'
  it("setup a prod-space app", async () => {
    let req_data = JSON.stringify({org:"test", space:"default", name:prod_app_name, size:"constellation", quantity:1, "type":"web", port:9000})
    let data = await httph.request('post', 'http://localhost:5000/apps', alamo_headers, req_data)
      
    let payload = JSON.stringify({repo:"https://github.com/akkeris/preview-app-test-repo", branch:"master", status_check:"true", auto_deploy:"true", username:"test", token:"ab832239defaa3298438abb"})
    await httph.request('post', `http://localhost:5000/apps/${prod_app_name}-default/builds/auto`, alamo_headers, payload)
    await httph.request('patch', `http://localhost:5000/apps/${prod_app_name}-default/features/preview`, alamo_headers, {"enabled":true}, null)
  })

  it("ensure a PR request doesnt create a preview app on a prod space app", async () => {
    let incoming = JSON.stringify(webhook_pr_opened)
    let hash = git.calculate_hash("testing", incoming)
    let headers = {'x-github-event':'pull_request', 'x-hub-signature':hash}
    let data = await httph.request('post', `http://localhost:5000/apps/${prod_app_name}-default/builds/auto/github`, headers, incoming)
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await httph.request('get', `http://localhost:5000/apps/${prod_app_name}-default/previews`, alamo_headers, null)
    previews = JSON.parse(previews.toString())
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
  })

  it("clean up site", async () => {
    await httph.request('delete', `http://localhost:5000/sites/${site_name}`, alamo_headers, null) 
  })

  it("ensure we clean up after ourselves", (done) => {
    httph.request('delete', `http://localhost:5000/apps/${app_name}-preview`, alamo_headers, null, (err, data) => {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      done();
    });
  })

  it("ensure we clean up after ourselves (2)", (done) => {
    httph.request('delete', `http://localhost:5000/apps/${prod_app_name}-default`, alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      done();
    });
  })

  if(process.env.SMOKE_TESTS) {
    it("ensure we clean up after ourselves (3)", (done) => {
      httph.request('delete', `http://localhost:5000/apps/${app_dummy_name}-preview`, alamo_headers, null, (err, data) => {
        if(err) {
          console.log(err)
        }
        expect(err).to.be.null;
        done();
      });
    })
  }
  
  it("ensure we clean up after ourselves (fail-safe)", async () => {
    let apps = JSON.parse(await httph.request('get', `http://localhost:5000/apps`, alamo_headers, null))
    await Promise.all(apps.filter((x) => { return x.space.name === 'preview' && x.organization.name === 'test' }).map(async (app) => {
      try {
        console.log('    = removing preview app:', app.name)
        await httph.request('delete', `http://localhost:5000/apps/${app.name}`, alamo_headers, null)
      } catch (e) {
        console.log('failed to delete app:', app)
      }
    }))
  })

})
