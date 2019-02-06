"use strict"

let support = require('./support/init.js');

describe("CRUD actions for topics", function() {  
  this.timeout(10000);
  process.env.PORT = 5000;
  process.env.TEST_MODE = "true"; // prevents creating actual topics. Since we can't delete them, we bail out before committing.
  // process.env.SKIP_KAFKA_TESTS = "true";
  process.env.AUTH_KEY = 'hello';
  const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test"};
  const elevated_alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};
  const httph = require('../lib/http_helper.js');
  const expect = require('chai').expect;
  const clusterName = 'maru';
  const region = 'us-seattle';
  const cluster = clusterName + '-' + region;
  const date = new Date().getTime();
  const newTopicName = 'test-' + date;
  const stgTopicName = 'stg-' + date;
  const newAppName = 'alamotest' + date.toString().substring(6);
  let aclIdConsumer, aclIdProducer, config;
  if(process.env.SKIP_KAFKA_TESTS) return

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
      console.dir(res)
      expect(res.name).to.be.a('string');
      done();
    })
  });

  it ("creates a stage topic", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics`, alamo_headers, {
      region: 'us-seattle',
      name: stgTopicName, 
      config: config,
      description: 'a topic for test',
      cluster: cluster, 
      organization: 'test',
      config: 'state'
    }, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      console.dir(res)
      expect(res.name).to.be.a('string');
      done();
    });
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

  it ("makes new app and attaches kafka addon", done => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers, {org: 'test', space: 'default', name: newAppName},
    (err, data) => {
      analyzeResponse(err, data, 'object');
      httph.request('post', `http://localhost:5000/apps/${newAppName}-default/addons`, alamo_headers, {
        plan: `kafka:${clusterName}`
      }, 
      (err, data) => {
        analyzeResponse(err, data, 'object');
        done();
      })
    });
  });

  it ("attach kafka addon twice fails", done => {
    httph.request('post', `http://localhost:5000/apps/${newAppName}-default/addons`, alamo_headers, {
      plan: `kafka:${clusterName}`
    }, 
    (err, data) => {
      let error = analyzeResponse(err, data, 'error');
      expect(error.message).to.equal("This addon is already created and attached to this application and cannot be used twice.");      
      done();
    })
  });

  it ("assigns a key schema", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/key-schema-mapping`, alamo_headers, {
      keytype: "string"
    }, 
    (err, data) => {
      analyzeResponse(err, data);
      done();
    })
  });

  it ("assigns a value schema", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/value-schema-mapping`, alamo_headers, {
      schema: "Test"
    }, 
    (err, data) => {
      analyzeResponse(err, data);
      done();
    })
  });
  
  let cgName =`${newTopicName}-cg`
  it ("creates a consumer ACL", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, {
      app: `${newAppName}-default`, 
      role: 'consumer',
      consumerGroupName: cgName
    }, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      aclIdConsumer = res.id
      expect(res.id).to.be.a('string');
      expect(res.consumerGroupName).to.be.a('string');
      done();
    })
  });

  it ("creates a producer ACL", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, {
      app: `${newAppName}-default`, 
      role: 'producer'
    }, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      aclIdProducer = res.id
      expect(res.id).to.be.a('string');
      done();
    })
  });

  it ("creates a producer ACL for stage topic", done => {
    httph.request('post', `http://localhost:5000/clusters/${cluster}/topics/${stgTopicName}/acls`, alamo_headers, {
      app: `${newAppName}-default`, 
      role: 'producer'
    }, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'object');
      expect(res.id).to.be.a('string');
      done();
    });
  });
  
  it ("gets a topic's ACLs", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, null, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'array');
      expect(res.length).to.equal(2);
      var aclId1 = res[0].id;
      var aclId2 = res[1].id;
      if(res[0].consumerGroupName) {
        let consumerGroupName = res[0].consumerGroupName;
        expect(aclId1).to.equal(aclIdConsumer)
        expect(aclId2).to.equal(aclIdProducer)
        expect(consumerGroupName).to.equal(cgName)
      } else {
        let consumerGroupName = res[1].consumerGroupName;
        expect(aclId2).to.equal(aclIdConsumer)
        expect(aclId1).to.equal(aclIdProducer)
        expect(consumerGroupName).to.equal(cgName)  
      }
      done();
    });
  });
  
  let appAcls;
  it ("gets an app's ACLs", done => {
    httph.request('get', `http://localhost:5000/apps/${newAppName}-default/topic-acls`, alamo_headers, null, 
    (err, data) => {
      let res = analyzeResponse(err, data, 'array');
      appAcls = res.length;
      expect(appAcls).to.be.greaterThan(0);
      done();
    });
  });
  
  it ("deletes an ACL with consumer group name", done => {
    httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls/${newAppName}-default/role/consumer/consumers/${cgName}`, alamo_headers, null, 
    (err, data) => {
      analyzeResponse(err, data);
      
      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, null, 
      (err, data) => {
        let obj = analyzeResponse(err, data, 'array');
        expect(obj.length).to.equal(1);
      });
      
      // Make sure it is removed from the app's ACLs.
      httph.request('get', `http://localhost:5000/apps/${newAppName}-default/topic-acls`, alamo_headers, null, 
      (err, data) => {
        let res = analyzeResponse(err, data, 'array');
        expect(res.length).to.equal(appAcls - 1);
        done();
      });
    });
  });
  
  it ("deletes an ACL", done => {
    httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls/${newAppName}-default/role/producer`, alamo_headers, null, 
    (err, data) => {
      analyzeResponse(err, data);
      
      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}/acls`, alamo_headers, null, 
      (err, data) => {
        let obj = analyzeResponse(err, data, 'array');
        expect(obj.length).to.equal(0);
      });
      
      // Make sure it is removed from the app's ACLs.
      httph.request('get', `http://localhost:5000/apps/${newAppName}-default/topic-acls`, alamo_headers, null, 
      (err, data) => {
        let res = analyzeResponse(err, data, 'array');
        expect(res.length).to.equal(appAcls - 2);
        done();
      });
    });
  });

  let cg;
  it("lists consumer groups", done => {
    httph.request('get', `http://localhost:5000/clusters/${cluster}/consumer-groups`, alamo_headers, null,
      (err, data) => {
        let res = analyzeResponse(err, data, 'array');
        console.log(`consumer groups : ${JSON.stringify(res)}`)
        if(res.length > 0) cg=res[0]
        done();
      }
    );
  });

  it("lists consumer group offsets", done => {
    if(cg) {
      httph.request('get', `http://localhost:5000/clusters/${cluster}/consumer-groups/${cg}/offsets`, alamo_headers, null,
        (err, data) => {
          let res = analyzeResponse(err, data, 'array');
          console.log(`Consumer group ${cg} offsets: ${JSON.stringify(res)}`)
          done();
        }
      );
    } else {
      done()
    }
  });

  it("lists consumer group members", done => {
    if(cg) {
      httph.request('get', `http://localhost:5000/clusters/${cluster}/consumer-groups/${cg}/members`, alamo_headers, null,
        (err, data) => {
          let res = analyzeResponse(err, data, 'array');
          console.log(`Consumer group ${cg} members: ${JSON.stringify(res)}`)
          done();
        }
      );
    } else {
      done()
    }
  });
  
  it ("deletes a topic", done => {
    httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}`, alamo_headers, null, 
    (err, data) => {
      analyzeResponse(err, data);
      
      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${newTopicName}`, alamo_headers, null, 
      (err, data) => {
        let obj = analyzeResponse(err, data, 404);
        done();
      });
    });
  });
  
  it ("deletes a topic with elevated access", done => {
    httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${stgTopicName}`, elevated_alamo_headers, null, 
    (err, data) => {
      analyzeResponse(err, data);
      
      // Make sure it's deleted.
      httph.request('get', `http://localhost:5000/clusters/${cluster}/topics/${stgTopicName}`, alamo_headers, null, 
      (err, data) => {
        let obj = analyzeResponse(err, data, 404);
        done();
      });
    });
  });

  it("recreates a topic with key, value schema mappings and ACLs", async function() {
    //create a topic
    let testTopicName = 'test-' + date;
    console.log(`create topic ${testTopicName}`)
    let consumerGroupName = `${testTopicName}-cg` 
    try {
      let create_resp = await httph.request('post', 
        `http://localhost:5000/clusters/${cluster}/topics`, 
        alamo_headers, 
        JSON.stringify({
          region: 'us-seattle',
          name: testTopicName, 
          config: config,
          description: 'a topic for test',
          cluster: cluster, 
          organization: 'test',
          config: 'state'
        })); 
      //create a value mapping
      let value_mapping_resp = await httph.request('post', 
        `http://localhost:5000/clusters/${cluster}/topics/${testTopicName}/value-schema-mapping`, 
        alamo_headers, JSON.stringify({schema: "Test"}));

      //create a key mapping 
      let key_mapping_resp = await httph.request('post', 
        `http://localhost:5000/clusters/${cluster}/topics/${testTopicName}/key-schema-mapping`, 
        alamo_headers, JSON.stringify({ keytype: "string"})); 

      //create an acl
      let acl_response = await httph.request('post', 
        `http://localhost:5000/clusters/${cluster}/topics/${testTopicName}/acls`, 
        alamo_headers, 
        JSON.stringify({
          app: `${newAppName}-default`, 
          role: 'consumer',
          consumerGroupName: consumerGroupName
        })) 

      // recreate topic
      let recreate_response = await httph.request('post', 
        `http://localhost:5000/clusters/${cluster}/topics/recreate`, 
        alamo_headers, {
          region: 'us-seattle',
          name: testTopicName, 
          config: config,
          description: 'a topic for test',
          cluster: cluster, 
          organization: 'test',
          config: 'state'
        })
      let recreate = JSON.parse(recreate_response)
      expect(recreate.subscriptions.length).to.equal(1);
      expect(recreate.subscriptions[0].app_name).to.equal(newAppName);
      expect(recreate.subscriptions[0].topic_name).to.equal(testTopicName);
      expect(recreate.subscriptions[0].role).to.equal("consumer");
      expect(recreate.subscriptions[0].consumer_group_name).to.equal(consumerGroupName);
      expect(recreate.key_mapping).to.equal("string");
      expect(recreate.schemas).to.equal("Test");

      //delete topic
      let res = await httph.request('delete', `http://localhost:5000/clusters/${cluster}/topics/${testTopicName}`, elevated_alamo_headers, null)
    } catch(e) {
      expect(false, `recreate failed with ${JSON.stringify(e)}`)
    }
  });

  it("ensure we clean up after ourselves", (done) => {
    //delete app
    httph.request('delete', 'http://localhost:5000/apps/' + newAppName + '-default', elevated_alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      done();
    });
  });
});

