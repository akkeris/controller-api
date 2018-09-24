"use strict"

const init = require('./support/init.js');
describe("topics: ensure we can CRUD topics", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.TEST_MODE = "true"; // prevents creating actual topics. Since we can't delete them, we bail out before committing.
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;
  const newTopicName = 'test' + new Date().getTime();
  let aclId;

  it ("creates a topic", done => {
    httph.request('post', 'http://localhost:5000/topics', alamo_headers, {
      region: 'us-seattle',
      name: newTopicName, 
      topic_config: 'state',
      description: 'a topic for test',
      cluster: 'non-prod', 
      organization: 'test',
      config: 'state'
    }, 
    (err, data) => {
      console.dir(err);
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.be.a('string');
      done();
    })
  });

  it ("lists topics", done => {
    httph.request('get', 'http://localhost:5000/topics', alamo_headers, null, 
    (err, data) => {
      console.dir(err);
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      expect(obj.length).to.be.greaterThan(0);
      done();
    });
  });

  it ("gets a topic", done => {
    httph.request('get', 'http://localhost:5000/topics/' + newTopicName, alamo_headers, null, 
    (err, data) => {
      console.dir(err);
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      done();
    });
  });

  it ("creates an ACL", done => {
    httph.request('post', `http://localhost:5000/topics/${newTopicName}/acls`, alamo_headers, {
      topic: newTopicName, 
      app: 'api-default', 
      role: 'consumer',
      cluster: 'non-prod',
      region: 'us'
    }, 
    (err, data) => {
      console.dir(err);
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('object');
      expect(obj.id).to.be.a('string');
      done();
    })
  });

  it ("gets a topic's ACLs", done => {
    httph.request('get', `http://localhost:5000/topics/${newTopicName}/acls`, alamo_headers, null, 
    (err, data) => {
      console.dir(err);
      expect(err).to.be.null;
      expect(data).to.be.an('string');
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      expect(obj.length).to.be.equal(1);
      aclId = obj[0].topic_acl;
      expect(aclId).to.be.a('string');
      done();
    });
  });

  it ("deletes an ACL", done => {
    httph.request('delete', `http://localhost:5000/topics/${newTopicName}/acls/${aclId}`, alamo_headers, null, 
    (err, data) => {
      console.dir(err);
      expect(err).to.be.null;
      // expect(data).to.be.null;

      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/topics/${newTopicName}/acls`, alamo_headers, null, 
      (err, data) => {
        console.dir(err);
        expect(err).to.be.an('object')
        expect(err).to.be.null;
        expect(data).to.be.an('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.length).to.be.equal(0);
      });

      done();
    });
  })
});
