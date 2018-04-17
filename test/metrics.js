"use strict"

const init = require('./support/init.js');

describe("metrics: ensure we can pull app metrics", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
  const running_app = require('../index.js');
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;

  it("covers getting metrics", (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default/metrics', alamo_headers, null, 
    (err, data) => {
      if(err) {
        console.log(err);
      } 
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.web).to.be.an('object');
      //expect(obj.web.requests).to.be.an('object');
      //expect(obj.web.response_time).to.be.an('object');
      expect(obj.web.memory_usage_bytes).to.be.an('object');
      expect(obj.web.memory_rss).to.be.an('object');
      expect(obj.web.memory_cache).to.be.an('object');
      expect(obj.web.cpu_user_seconds_total).to.be.an('object');
      expect(obj.web.cpu_usage_seconds_total).to.be.an('object');
      done();
    });
  });
})