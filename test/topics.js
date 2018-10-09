"use strict"

require('./support/init.js');

describe("CRUD actions for topics", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.TEST_MODE = "true"; // prevents creating actual topics. Since we can't delete them, we bail out before committing.
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
  const httph = require('../lib/http_helper.js');
  const expect = require('chai').expect;
  const clusterName = 'maru';
  const region = 'us-seattle';
  const cluster = clusterName + '-' + region;
  const newTopicName = 'test-' + new Date().getTime();
  let aclId, config;

  function analyzeResponse(err, data, expectedData){
    let res;
    if (err && expectedData != 'error' && typeof expectedData != 'number'){
      expect.fail(0, 1, 'Received error: \n' + JSON.stringify(err));
    }
    else if (expectedData == 'error'){
      res = err; 
    }
    else if (expectedData){
      if (typeof expectedData == 'number'){
        expect(err.code).to.equal(expectedData);
      }
      else {
        expect(data).to.be.a('string');
        res = JSON.parse(data);
        if (expectedData == 'array' || expectedData == 'object' || expectedData == 'number' || expectedData == 'boolean' || expectedData == 'string'){
          expect(res).to.be.an(expectedData);
        }
        else if (res != expectedData){
          console.log('Expected:\n' + expectedData);
          console.log('Received:\n' + res);
          expect.fail(0, 1, 'Unexpected response.');
        }
      }
    }
 
    return res;
  }

  it ("lists clusters", done => {
    httph.request('get', `http://localhost:5000/clusters`, alamo_headers, null,
    (err, data) => {
      let arr = analyzeResponse(err, data, 'array');
      expect(arr.length).to.be.greaterThan(0, 'no elements in response');
      done();
    });
  });
  
  it ("gets cluster info", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}`, alamo_headers, null,
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      expect(res.name).to.equal(clusterName);
      done();
    });
  });

  it ("gets topic configs", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}/configs`, alamo_headers, null,
    (err, data) => {
      let res = analyzeResponse(err, data, 'array');
      expect(res).to.be.an('array');
      expect(res.length).to.be.greaterThan(0);
      config = res[0];
      done();
    });
  });

  it ("fails to create a topic with invalid name", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics`, alamo_headers, {
      region: 'us-seattle',
      name: 'bad-' + newTopicName, 
      config: config,
      description: 'a topic for test',
      cluster: cluster, 
      organization: 'test',
      config: 'state'
    }, 
    (err, data) => {
      expect(err).to.not.be.null;
      done();
    })
  });

  it ("creates a topic", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics`, alamo_headers, {
      region: 'us-seattle',
      name: newTopicName, 
      config: config,
      description: 'a topic for test',
      cluster: cluster, 
      organization: 'test',
      config: 'state'
    }, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      expect(res.id).to.be.a('string');
      done();
    })
  });

  it ("lists topics", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}/topics`, alamo_headers, null, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'array');
      expect(res.length).to.be.greaterThan(0);
      done();
    });
  });

  it ("gets a topic", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}`, alamo_headers, null, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      expect(res.name).to.equal(newTopicName);
      done();
    });
  });

  it ("creates an ACL", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, {
      app: 'api-default', 
      role: 'consumer'
    }, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      expect(res.id).to.be.a('string');
      done();
    })
  });

  it ("gets a topic's ACLs", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, null, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'array');
      expect(res.length).to.equal(1);
      aclId = res[0].topic_acl;
      expect(aclId).to.be.a('string');
      done();
    });
  });
  
  let appAcls;
  it ("gets an app's ACLs", done => {
    httph.request('get', `http://localhost:5000/apps/api-default/topic-acls`, alamo_headers, null, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'array');
      appAcls = res.length;
      expect(appAcls).to.be.greaterThan(0);
      done();
    });
  });

  it ("deletes an ACL", done => {
    httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls/api-default`, alamo_headers, null, 
    (err, data) => {
      analyzeResponse(err, data);

      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, null, 
        (err, data) => {
          let obj = analyzeResponse(err, data, 'array');
          expect(obj.length).to.equal(0);
      });

      // Make sure it is removed from the app's ACLs.
      httph.request('get', `http://localhost:5000/apps/api-default/topic-acls`, alamo_headers, null, 
        (err, data) => {
          let res = analyzeResponse(err, data, 'array');
          expect(res.length).to.equal(appAcls - 1);
      });

      done();
    });
  });

  it ("deletes a topic", done => {
    httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}`, alamo_headers, null, 
    (err, data) => {
      analyzeResponse(err, data);

      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}`, alamo_headers, null, 
      (err, data) => {
        let obj = analyzeResponse(err, data, 404);
      });

      done();
    });
  });

});

