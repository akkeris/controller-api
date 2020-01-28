
"use strict"

describe("preview sites: ensure preview sites work appropriately", function() {
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";
  process.env.TEST_MODE = "true"
  const expect = require("chai").expect
  const init = require('./support/init.js');

  // Create a two test apps and a site, add both test apps into site
  let previewapp1 = null
  let previewapp2 = null
  let previewsite = null
  it("setup conditions for preview site", async () => {
    previewapp1 = await init.create_test_app('preview')
    previewapp2 = await init.create_test_app('preview')
    await init.setup_auto_build(previewapp1, 'https://github.com/akkeris/preview-app-test-repo', 'master', 'user', 'testing')
    await init.setup_auto_build(previewapp2, 'https://github.com/akkeris/preview-app-test-repo', 'master', 'user1', 'testing')
    await init.enable_feature(previewapp1, 'preview')
    await init.enable_feature(previewapp1, 'preview-sites')
    await init.enable_feature(previewapp2, 'preview')
    await init.enable_feature(previewapp2, 'preview-sites')
    previewsite = await init.create_test_site()
    await init.add_to_site(previewsite, previewapp1, '/foo-bar', '/foo-bar')
    await init.create_fake_formation(previewapp1)
    await init.add_to_site(previewsite, previewapp2, '/fee-bar', '/fee-bar')
    await init.create_fake_formation(previewapp2)
  })

  it("Ensure an existing preview site isnt included in the list of sites to create for preview sites", async() => {
    // Create first successful preview app
    let data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews1 = await init.get_previews(previewapp1)
    expect(previews1).to.be.an('array')
    expect(previews1.length).to.equal(1)
    let routes1 = await init.get_routes(previewapp1)
    expect(routes1).to.be.an('array')
    expect(routes1.length).to.equal(1)

    // Create a successful PR to previewapp2
    let data2 = await init.fake_github_notice(previewapp2, './test/support/github-webhook-pr-opened-2.json')
    expect(data2.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews2 = await init.get_previews(previewapp2)
    expect(previews2).to.be.an('array')
    expect(previews2.length).to.equal(1)

    // Ensure we have two routes for the original apps, one for the app and one for the preview site of the other app
    // However, each preview app should only have one route, to the preview site it's in.
    let routes2 = await init.get_routes(previewapp2)
    expect(routes2).to.be.an('array')
    expect(routes2.length).to.equal(2)
    routes1 = await init.get_routes(previewapp1)
    expect(routes1).to.be.an('array')
    expect(routes1.length).to.equal(2)
    let routesorig1 = await init.get_routes(previews1[0].app)
    expect(routesorig1).to.be.an('array')
    expect(routesorig1.length).to.equal(1)
    let routesorig2 = await init.get_routes(previews2[0].app)
    expect(routesorig2).to.be.an('array')
    expect(routesorig2.length).to.equal(1)

    // Kill preview apps, ensure after they are closed only one route remains in each.
    await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-closed.json')
    await init.fake_github_notice(previewapp2, './test/support/github-webhook-pr-closed-2.json')
    previews1 = await init.get_previews(previewapp1)
    expect(previews1.length).to.equal(0)
    routes1 = await init.get_routes(previewapp1)
    expect(routes1.length).to.equal(1)
    previews2 = await init.get_previews(previewapp2)
    expect(previews2.length).to.equal(0)
    routes2 = await init.get_routes(previewapp2)
    expect(routes2.length).to.equal(1)
  })

  it("Ensure putting a pr into a branch tied to an open pr doesnt cause a preview of a preview", async() => {
    // Create first successful preview app
    let data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews1 = await init.get_previews(previewapp1)
    expect(previews1).to.be.an('array')
    expect(previews1.length).to.equal(1)

    // Create a successful PR to previewapp1, no preview app should be created.
    let data2 = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened-3.json')
    expect(data2.toString('utf8')).to.equal('This webhook took place on a branch that isnt of interest.')
    previews1 = await init.get_previews(previewapp1)
    expect(previews1).to.be.an('array')
    expect(previews1.length).to.equal(1)

    let previews2 = await init.get_previews(previews1[0].app)
    expect(previews2).to.be.an('array')
    expect(previews2.length).to.equal(0)

    // kill preview apps
    await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-closed.json')
    previews1 = await init.get_previews(previewapp1)
    expect(previews1.length).to.equal(0)
  })

  it("Ensure submitting a duplicate PR opening doesnt completely break the world.", async() => {
    let data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
    let data2 = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)

    data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-closed.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')

    previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
  });

  it("Ensure submitting a duplicate PR closing doesnt completely break the world.", async() => {
    let data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
    await init.wait(5000)
    let data2 = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-closed.json')
    previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)

    data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-closed.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')

    previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
  });

  it("Ensure submitting a PR, closing, then resubmitting the same PR is successful", async() => {
    let data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    let previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
    data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-closed.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(0)
    data = await init.fake_github_notice(previewapp1, './test/support/github-webhook-pr-opened.json')
    expect(data.toString('utf8')).to.equal('{"code":201,"message":"Roger that, message received."}')
    previews = await init.get_previews(previewapp1)
    expect(previews).to.be.an('array')
    expect(previews.length).to.equal(1)
  })

  it("cleanup", async () => {
    await init.remove_app(previewapp1)
    await init.remove_app(previewapp2)
    await init.remove_site(previewsite)
  })
})