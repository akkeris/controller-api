/* eslint-disable no-unused-expressions */
process.env.DEFAULT_PORT = '5000';
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const alamo_headers = {
  Authorization: process.env.AUTH_KEY,
  'User-Agent': 'Hello',
  'x-username': 'test',
  'x-elevated-access': 'true',
};

describe('addon services: plans, services listing and getting.', function () {
  const support = require('./support/init.js');
  this.timeout(10000);

  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');

  function validate_service(obj) {
    expect(obj.actions).to.be.an('array');
    expect(obj.cli_plugin_name).to.be.a('string');
    expect(obj.created_at).to.be.a('string');
    expect(obj.description).to.be.a('string');
    expect(obj.human_name).to.be.a('string');
    expect(obj.id).to.be.a('string');
    expect(obj.name).to.be.a('string');
    expect(obj.state).to.be.a('string');
    expect(obj.available_regions).to.be.an('array');
    expect(obj.supports_multiple_installations).to.be.a('boolean');
    expect(obj.supports_sharing).to.be.a('boolean');
    expect(obj.updated_at).to.be.a('string');
  }

  function validate_plan(obj) {
    expect(obj.addon_service).to.be.an('object');
    expect(obj.addon_service.id).to.be.a('string');
    expect(obj.addon_service.name).to.be.a('string');
    expect(obj.created_at).to.be.a('string');
    expect(obj.default).to.be.a('boolean');
    expect(obj.description).to.be.a('string');
    expect(obj.human_name).to.be.a('string');
    expect(obj.id).to.be.a('string');
    expect(obj.installable_inside_private_network).to.be.a('boolean');
    expect(obj.installable_outside_private_network).to.be.a('boolean');
    expect(obj.name).to.be.a('string');
    expect(obj.key).to.be.a('string');
    expect(obj.price).to.be.an('object');
    expect(obj.price.cents).to.be.a('number');
    expect(obj.price.unit).to.be.a('string');
    expect(obj.available_regions).to.be.an('array');
    expect(obj.available_regions[0]).to.be.a('string');
    expect(obj.compliance).to.be.an('array');
    expect(obj.space_default).to.be.a('boolean');
    expect(obj.state).to.be.a('string');
    expect(obj.updated_at).to.be.a('string');
  }

  it('covers getting a list of services', async () => {
    await support.wait(1250);
    const data = await httph.request('get', 'http://localhost:5000/addon-services', alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    obj.forEach(validate_service);
  });
  it('covers getting a specific service (postgresql)', async () => {
    const data = await httph.request('get', 'http://localhost:5000/addon-services/akkeris-postgresql', alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('object');
    validate_service(obj);
  });
  it("covers getting a specific service's plans (postgresql)", async () => {
    const data = await httph.request(
      'get',
      'http://localhost:5000/addon-services/akkeris-postgresql/plans',
      alamo_headers,
      null,
    );
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    expect(obj[0]).to.be.an('object');
    obj.forEach(validate_plan);
    it("covers getting a specific service's plan", async () => {
      const plan_data = await httph.request(
        'get',
        'http://localhost:5000/addon-services/akkeris-postgresql/plans/standard-0',
        alamo_headers,
        null,
      );
      expect(plan_data).to.be.a('string');
      const plan_obj = JSON.parse(plan_data);
      expect(plan_obj).to.be.an('object');
      expect(plan_obj.provisioned_by).to.be.an('array');
      validate_plan(plan_obj);
    });
    it('covers ensuring a 404 is for unknown service ', (done) => {
      httph.request('get', 'http://localhost:5000/addon-services/doestexist', alamo_headers, null,
        (err, resp_data) => {
          expect(err).to.be.an('object');
          expect(err.code).to.equal(404);
          expect(resp_data).to.be.null;
          done();
        });
    });
    it('covers ensuring a 404 is for unknown plan ', (done) => {
      httph.request('get', 'http://localhost:5000/addon-services/akkeris-postgresql/plans/doesnotexist', alamo_headers, null,
        (err, resp_data) => {
          expect(err).to.be.an('object');
          expect(err.code).to.equal(404);
          expect(resp_data).to.be.null;
          done();
        });
    });
    it('covers getting a list of services (again, some services take time to register)', async () => {
      const services_data = await httph.request('get', 'http://localhost:5000/addon-services', alamo_headers, null);
      expect(services_data).to.be.a('string');
      const services_obj = JSON.parse(services_data);
      expect(services_obj).to.be.an('array');
      services_obj.forEach(validate_service);
    });
  });
  if (process.env.SMOKE_TESTS) {
    it('covers getting a specific service (anomaly)', async () => {
      const data = await httph.request('get', 'http://localhost:5000/addon-services/anomaly', alamo_headers, null);
      expect(data).to.be.a('string');
      const obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      validate_service(obj);
    });
    it('covers getting a specific service (twilio)', async () => {
      const data = await httph.request('get', 'http://localhost:5000/addon-services/twilio', alamo_headers, null);
      expect(data).to.be.a('string');
      const obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      validate_service(obj);
    });
    it("covers getting a specific service's plans (anomaly)", async () => {
      const data = await httph.request('get', 'http://localhost:5000/addon-services/anomaly/plans', alamo_headers, null);
      expect(data).to.be.a('string');
      const obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      expect(obj[0]).to.be.an('object');
      obj.forEach(validate_plan);
    });
    it("covers getting a specific service's plans (twilio)", async () => {
      const data = await httph.request('get', 'http://localhost:5000/addon-services/twilio/plans', alamo_headers, null);
      expect(data).to.be.a('string');
      const obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      expect(obj[0]).to.be.an('object');
      obj.forEach(validate_plan);
    });
  }
});
