"use strict"
process.env.PORT = 5000;
process.env.DEFAULT_PORT = "5000";
process.env.AUTH_KEY = 'hello';
process.env.ENCRYPT_KEY = 'hello';
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
const user_alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test"};
const http = require('http');
const expect = require("chai").expect;

const init = require('./support/init.js');
describe("regions: list and get available regions", function() {
  this.timeout(100000);
  const httph = require('../lib/http_helper.js');

  let validate_us_region = function(obj) {
    expect(obj).to.be.an('object')
    expect(obj.country).to.be.a('string')
    expect(obj.created_at).to.be.a('string')
    expect(obj.description).to.be.a('string')
    expect(obj.locale).to.be.a('string')
    expect(obj.name).to.be.a('string')
    expect(obj.private_capable).to.be.a('boolean')
    expect(obj.provider).to.be.an('object')
    expect(obj.provider.name).to.be.a('string')
    expect(obj.provider.region).to.be.a('string')
    expect(obj.provider.availability_zones).to.be.an('array')
    expect(obj.provider.availability_zones[0]).to.be.a('string')
    expect(obj.provider.availability_zones[1]).to.be.a('string')
    expect(obj.high_availability).to.be.a('boolean')
    expect(obj.updated_at).to.be.a('string')
  }

  it("covers listing all regions", (done) => {
    httph.request('get', 'http://localhost:5000/regions', alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data[0]).to.be.an('object');
      validate_us_region(data[0])
      done();
    });
  });
  it("covers getting specific region", (done) => {
    httph.request('get', 'http://localhost:5000/regions/' + process.env.TEST_REGION, alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data)
      validate_us_region(data)
      done();
    });
  });
  
  it("covers ensuring regions cannot be created unless its an elevated access request", (done) => {
    httph.request('post', 'http://localhost:5000/regions', user_alamo_headers, {"name":"should-not-happen"}, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(403);
      expect(data).to.be.null;
      done();
    });
  });
  it("covers ensuring regions cannot be updated unless its an elevated access request", (done) => {
    httph.request('patch', 'http://localhost:5000/regions/' + process.env.TEST_REGION, user_alamo_headers, {"name":"should-not-happen"}, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(403);
      expect(data).to.be.null;
      done();
    });
  });

  it("covers ensuring regions cannot be deleted unless its an elevated access request", (done) => {
    httph.request('delete', 'http://localhost:5000/regions/'  + process.env.TEST_REGION, user_alamo_headers, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(403);
      expect(data).to.be.null;
      done();
    });
  });

  it("covers requiring name on creation", (done) => {
    let payload = {"description":"description","country":"country","locale":"locale","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]},"high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {

      expect(err).to.be.an('object');
      expect(err.code).to.equal(422)
      expect(err.message).to.equal('The regions name was not provided and is required.')
      done();
    });
  });

  it("covers requiring valid name on creation", (done) => {
    let payload = {"name":"fubar!", "description":"description","country":"country","locale":"locale","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]},"high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {

      expect(err).to.be.an('object');
      expect(err.code).to.equal(422)
      expect(err.message).to.equal('The region name was invalid, it must be an alpha numeric and may contain a hyphen.')
      done();
    });
  });

  it("covers requiring valid country on creation", (done) => {
    let payload = {"name":"fubar", "description":"description","locale":"locale","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]},"high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {

      expect(err).to.be.an('object');
      expect(err.code).to.equal(422)
      expect(err.message).to.equal('The specified country field does not exist and is required.')
      done();
    });
  });

  it("covers requiring valid description on creation", (done) => {
    let payload = {"name":"fubar","country":"country","locale":"locale","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]},"high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {

      expect(err).to.be.an('object');
      expect(err.code).to.equal(422)
      expect(err.message).to.equal('The description field for this region is required.')
      done();
    });
  });

  it("covers requiring valid locale on creation", (done) => {
    let payload = {"name":"fubar","country":"country","description":"description","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]},"high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {

      expect(err).to.be.an('object');
      expect(err.code).to.equal(422)
      expect(err.message).to.equal('The specified locale must exist.')
      done();
    });
  });

  it("covers creating a region", (done) => {
    let payload = {"name":"fubar", "description":"description","country":"country","locale":"locale","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]}, "high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      data = JSON.parse(data)
      validate_us_region(data)
      expect(data.name).to.equal('fubar')
      expect(data.description).to.equal('description')
      expect(data.country).to.equal('country')
      expect(data.locale).to.equal('locale')
      expect(data.provider).to.be.an('object')
      expect(data.provider.name).to.equal('provider_name')
      expect(data.provider.region).to.equal('provider_region')
      expect(data.provider.availability_zones).to.be.an('array')
      expect(data.provider.availability_zones[0]).to.equal('zone1')
      expect(data.provider.availability_zones[1]).to.equal('zone2')
      expect(data.high_availability).to.equal(false)
      expect(data.private_capable).to.equal(true)
      done();
    });
  });

  it("covers not allowing duplicate names", (done) => {
    let payload = {"name":"fubar", "description":"description","country":"country","locale":"locale","provider":{"name":"provider_name","region":"provider_region","availability_zones":["zone1","zone2"]},"high_availability":false, "private_capable":true}
    httph.request('post', 'http://localhost:5000/regions', alamo_headers, JSON.stringify(payload), (err, data) => {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(409)
      done();
    });
  });

  it("covers getting a region", (done) => {
    httph.request('get', 'http://localhost:5000/regions/fubar', alamo_headers, null, (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      data = JSON.parse(data)
      validate_us_region(data)
      expect(data.name).to.equal('fubar')
      expect(data.description).to.equal('description')
      expect(data.country).to.equal('country')
      expect(data.locale).to.equal('locale')
      expect(data.provider).to.be.an('object')
      expect(data.provider.name).to.equal('provider_name')
      expect(data.provider.region).to.equal('provider_region')
      expect(data.provider.availability_zones).to.be.an('array')
      expect(data.provider.availability_zones[0]).to.equal('zone1')
      expect(data.provider.availability_zones[1]).to.equal('zone2')
      expect(data.high_availability).to.equal(false)
      expect(data.private_capable).to.equal(true)
      done();
    });
  });

  it("covers listing regions and finding our created region", (done) => {
    httph.request('get', 'http://localhost:5000/regions', alamo_headers, null, (err, resp) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      resp = JSON.parse(resp)
      let fubar_found = false;
      for(let i=0; i < resp.length; i++) {
        let data = resp[i]
        validate_us_region(data)
        if(data.name === "fubar") {
          fubar_found = true
          expect(data.name).to.equal('fubar')
          expect(data.description).to.equal('description')
          expect(data.country).to.equal('country')
          expect(data.locale).to.equal('locale')
          expect(data.provider).to.be.an('object')
          expect(data.provider.name).to.equal('provider_name')
          expect(data.provider.region).to.equal('provider_region')
          expect(data.provider.availability_zones).to.be.an('array')
          expect(data.provider.availability_zones[0]).to.equal('zone1')
          expect(data.provider.availability_zones[1]).to.equal('zone2')
          expect(data.high_availability).to.equal(false)
          expect(data.private_capable).to.equal(true)
        }
      }
      expect(fubar_found).to.equal(true)
      done();
    });
  });

  it("covers deleting a region", (done) => {
    httph.request('delete', 'http://localhost:5000/regions/fubar', alamo_headers, null, (err, data) => {
      if(err) {
        console.error(err)
      }
      expect(err).to.be.null;
      data = JSON.parse(data)
      validate_us_region(data)
      expect(data.name).to.equal('fubar')
      expect(data.description).to.equal('description')
      expect(data.country).to.equal('country')
      expect(data.locale).to.equal('locale')
      expect(data.provider).to.be.an('object')
      expect(data.provider.name).to.equal('provider_name')
      expect(data.provider.region).to.equal('provider_region')
      expect(data.provider.availability_zones).to.be.an('array')
      expect(data.provider.availability_zones[0]).to.equal('zone1')
      expect(data.provider.availability_zones[1]).to.equal('zone2')
      expect(data.high_availability).to.equal(false)
      expect(data.private_capable).to.equal(true)
      done();
    });
  });

});
