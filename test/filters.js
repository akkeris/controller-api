
"use strict"

describe("filters: ensure filters can be created and applied.", function() {
  this.timeout(30000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = "5000";
  process.env.TEST_MODE = "true"
  const expect = require("chai").expect
  const init = require('./support/init.js');
  const httph = require('../lib/http_helper.js');
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-silent-error":"true", "x-username":"filter-test-user", "x-elevated-access":"true"};

  let testapp = null
  let testapp_filter = null
  let testapp_filter_attachment = null

  it("create: check for required field when creating a filter", async () => {
    testapp = await init.create_test_app('default')
    let payload = {
      "name":"test-filter-name"
    }
    try {
      await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.description = "foo"
    try {
      await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.type = "foo"
    try {
      await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.type = "jwt"
    try {
      await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.options = {}
    payload.options.jwks_uri = "https://foobar.com"
    try {
      await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.options.issuer = "fooissuer"
    try {
      await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }
    payload.organization = "test"
    let response = JSON.parse(await httph.request('post', `http://localhost:5000/filters`, alamo_headers, payload))
    expect(response.name).to.equal("test-filter-name")
    expect(response.description).to.equal("foo")
    expect(response.type).to.equal("jwt")
    expect(response.options.jwks_uri).to.equal("https://foobar.com")
    expect(response.options.issuer).to.equal("fooissuer")
    expect(response.created_at).to.be.a('string')
    expect(response.updated_at).to.be.a('string')
    expect(response.organization).to.be.an('object')
    expect(response.organization.id).to.be.a('string')
    expect(response.id).to.be.a('string')
  });

  it("list filters", async () => {
    let filters = JSON.parse(await httph.request('get', 'http://localhost:5000/filters', alamo_headers, null))

    let filter = null
    filters.forEach((x) => {
      if(x.name === "test-filter-name") {
        filter = x;
      }
    })
    expect(filter).to.be.an('object')
    expect(filter.name).to.equal("test-filter-name")
    expect(filter.description).to.equal("foo")
    expect(filter.type).to.equal("jwt")
    expect(filter.options.jwks_uri).to.equal("https://foobar.com")
    expect(filter.options.issuer).to.equal("fooissuer")
    expect(filter.created_at).to.be.a('string')
    expect(filter.updated_at).to.be.a('string')
    expect(filter.organization).to.be.an('object')
    expect(filter.organization.id).to.be.a('string')
    expect(filter.id).to.be.a('string')
  })

  it("get a filter", async () => {
    let filter = JSON.parse(await httph.request('get', 'http://localhost:5000/filters/test-filter-name', alamo_headers, null))
    expect(filter).to.be.an('object')
    expect(filter.name).to.equal("test-filter-name")
    expect(filter.description).to.equal("foo")
    expect(filter.type).to.equal("jwt")
    expect(filter.options.jwks_uri).to.equal("https://foobar.com")
    expect(filter.options.issuer).to.equal("fooissuer")
    expect(filter.created_at).to.be.a('string')
    expect(filter.updated_at).to.be.a('string')
    expect(filter.organization).to.be.an('object')
    expect(filter.organization.id).to.be.a('string')
    expect(filter.id).to.be.a('string')
  })

  it("update a filter", async () => {
    let payload = {}
    payload.name = 'test-filter-name'
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }
    payload.description = 'second desc'
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }
    payload.type = 'foo'
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }
    payload.type = 'jwt'
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.options = {}
    payload.options.jwks_uri = "https://foobar2.com"
    try {
      await httph.request('put', 'http://localhost:5000/filters/test-filter-name', alamo_headers, payload)
      expect(true).to.equal(false)
    } catch (e) {
      // do nothing
    }

    payload.options.issuer = "fooissuer2"
    testapp_filter = JSON.parse(await httph.request('put', `http://localhost:5000/filters/test-filter-name`, alamo_headers, payload))
    expect(testapp_filter).to.be.an('object')
    expect(testapp_filter.name).to.equal("test-filter-name")
    expect(testapp_filter.description).to.equal("second desc")
    expect(testapp_filter.type).to.equal("jwt")
    expect(testapp_filter.options.jwks_uri).to.equal("https://foobar2.com")
    expect(testapp_filter.options.issuer).to.equal("fooissuer2")
    expect(testapp_filter.created_at).to.be.a('string')
    expect(testapp_filter.updated_at).to.be.a('string')
    expect(testapp_filter.organization).to.be.an('object')
    expect(testapp_filter.organization.id).to.be.a('string')
    expect(testapp_filter.id).to.be.a('string')
  })


  it("create filter attachment on an app", async() => {
    expect(testapp_filter).to.be.an('object')
    let payload = {
      "filter":{
        "id":testapp_filter.id
      },
      "options":{
        "excludes":["/foobar"]
      }
    }
    testapp_filter_attachment = JSON.parse(await httph.request('post', `http://localhost:5000/apps/${testapp.id}/filters`, alamo_headers, payload))
    expect(testapp_filter_attachment).to.be.an('object')
    expect(testapp_filter_attachment.options).to.be.an('object')
    expect(testapp_filter_attachment.options.excludes).to.be.an('array')
    expect(testapp_filter_attachment.options.excludes[0]).to.equal('/foobar')
    expect(testapp_filter_attachment.filter.id).to.equal(testapp_filter.id)
    expect(testapp_filter_attachment.created_at).to.be.a('string')
    expect(testapp_filter_attachment.updated_at).to.be.a('string')
  })

  it("list filter attachments on an app", async() => {
    expect(testapp_filter).to.be.an('object')
    let fa = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${testapp.id}/filters`, alamo_headers, null))
    expect(fa.length).to.equal(1)
    expect(fa[0]).to.be.an('object')
    expect(fa[0].options).to.be.an('object')
    expect(fa[0].options.excludes).to.be.an('array')
    expect(fa[0].options.excludes[0]).to.equal('/foobar')
    expect(fa[0].filter.id).to.equal(testapp_filter.id)
    expect(fa[0].created_at).to.be.a('string')
    expect(fa[0].updated_at).to.be.a('string')
  })

  //it("update filter attachment on an app", async() => {
  //  expect(testapp_filter).to.be.an('object')
  //})

  it("get filter attachments on an app", async() => {
    expect(testapp_filter).to.be.an('object')
    expect(testapp_filter_attachment).to.be.an('object')
    let fa = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${testapp.id}/filters/${testapp_filter_attachment.id}`, alamo_headers, null))
    expect(fa).to.be.an('object')
    expect(fa.options).to.be.an('object')
    expect(fa.options.excludes).to.be.an('array')
    expect(fa.options.excludes[0]).to.equal('/foobar')
    expect(fa.filter.id).to.equal(testapp_filter.id)
    expect(fa.created_at).to.be.a('string')
    expect(fa.updated_at).to.be.a('string')
  })

  it("delete filter attachments on an app", async() => {
    expect(testapp_filter).to.be.an('object')
    expect(testapp_filter_attachment).to.be.an('object')
    await httph.request('delete', `http://localhost:5000/apps/${testapp.id}/filters/${testapp_filter_attachment.id}`, alamo_headers, null)
    let fa = JSON.parse(await httph.request('get', `http://localhost:5000/apps/${testapp.id}/filters`, alamo_headers, null))
    expect(fa.length).to.equal(0)
  })

  it("delete: ensure a filter can be removed", async () => {
    await httph.request('delete', 'http://localhost:5000/filters/test-filter-name', alamo_headers, null)
  })

  it("delete: clean up after ourselves", async () => {
    await init.remove_app(testapp)
  });
});