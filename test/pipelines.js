"use strict"

process.env.DEFAULT_PORT = "5000";
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const alamo_headers = {"Authorization":process.env.AUTH_KEY, "User-Agent":"Hello", "x-username":"test", "x-elevated-access":"true"};


function wait_for_app_content(httph, app, content, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for app to turn up");
  }
  if(iteration === 180) {
    process.stdout.write("\n");
    callback({code:0, message:"Timeout waiting for app to turn up."});
  }
  setTimeout(function() {
    httph.request('get', 'https://' + app + process.env.ALAMO_BASE_DOMAIN, {'X-Timeout':1500}, null, function(err, data) {
      if(err || data.indexOf(content) === -1) {
        process.stdout.write(".");
        setTimeout(wait_for_app_content.bind(null, httph, app, content, callback, (iteration + 1)), 250);
        //callback(err, null);
      } else {
        process.stdout.write("\n");
        callback(null, data);
      }
    });
  },500);
}

function wait_for_pipeline_build(httph, app, build_id, callback, iteration) {
  iteration = iteration || 1;
  if(iteration === 1) {
    process.stdout.write("    ~ Waiting for build");
  }
  httph.request('get', 'http://localhost:5000/apps/' + app + '/builds/' + build_id, alamo_headers, null, function(err, data) {
    if(err && err.code === 423) {
      process.stdout.write(".");
      setTimeout(wait_for_pipeline_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
    } else if(err) {
      callback(err, null);
    } else {
      let build_info = JSON.parse(data);
      if(build_info.status === 'pending' || build_info.status === 'queued') {
        process.stdout.write(".");
        setTimeout(wait_for_pipeline_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
      } else {
        process.stdout.write("✓\n");
        callback(null, data);
      }
    }
  });
}


const nonpipelined_sources = {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:781a4cc4ae21966caf63b121f614c734c74f6a455504d18f53e85c47a80bd98b","url":"docker://docker.io/akkeris/test-pipelines1:latest","docker_registry":"","docker_login":"","docker_password":""};
const pipeline1_sources =    {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:75ef6bfeb0828a2d04dc515137df2c68e9774d9f38bd182da807e0a713d81c34","url":"docker://docker.io/akkeris/test-pipelines2:latest","docker_registry":"","docker_login":"","docker_password":""};
const pipeline2_sources =    {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:7e5bfcb419ba312f8c8c9b26109d4bfa3da3a8579cf60eeed689b6f405102291","url":"docker://docker.io/akkeris/test-pipelines3:latest","docker_registry":"","docker_login":"","docker_password":""};
const pipeline3_sources =    {"sha":"123456","org":"ocatnner","repo":"https://github.com/abcd/some-repo","branch":"master","version":"v1.0","checksum":"sha256:3ba47b4dea485b1d5b362c453fd676c994ee3455f1848e203b7fa9cf8db79274","url":"docker://docker.io/akkeris/test-pipelines4:latest","docker_registry":"","docker_login":"","docker_password":""};

const init = require('./support/init.js');

describe("pipelines", function() {
  this.timeout(300000);
  const httph = require('../lib/http_helper.js');
  const expect = require("chai").expect;

  let app1 = 'pl1';
  let app2 = 'pl2';
  let app3 = 'pl1';
  let app4 = 'pl4';
  let pipeline1_release_id = null;

  let app1_coupling_id = null;
  let app2_coupling_id = null;
  let app3_coupling_id = null;
  let app4_coupling_id = null;
  let pipeline_id = null;
  let app1_id = null;
  let app2_id = null;
  let app3_id = null;
  let app4_id = null;

  it("pre-check removing multiple apps for pipelining (1).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app1 + '-pipline-test-space1', alamo_headers, null, function(err, data) {
      // dont care, just make sure it doesnt exist.
      done();
    });
  });
  it("pre-check removing multiple apps for pipelining (2).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app2 + '-pipline-test-space1', alamo_headers, null, function(err, data) {
        // dont care, just make sure it doesnt exist
        done();
      });
  });
  it("pre-check removing multiple apps for pipelining (3).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app3 + '-pipline-test-space2', alamo_headers, null, function(err, data) {
        // dont care, just make sure it doesnt exist
        done();
      });
  });
  it("pre-check removing multiple apps for pipelining (4).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app4 + '-pipline-test-space3', alamo_headers, null, function(err, data) {
        // dont care, just make sure it doesnt exist
        done();
      });
  });

  it("covers getting pipeline stages", function(done) {
    httph.request('get', 'http://localhost:5000/pipeline-stages', alamo_headers, null, function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  it("covers creating pipline", function(done) {
    // remove the pipeline just incase, we'll ignore the result.
    httph.request('delete','http://localhost:5000/pipelines/test-pipeline', alamo_headers, null, function(err, data) {
      httph.request('post','http://localhost:5000/pipelines', alamo_headers, JSON.stringify({name:'test-pipeline'}), function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        data = JSON.parse(data);
        expect(data.name).to.be.a('string');
        expect(data.id).to.be.a('string');
        expect(data.created_at).to.be.a('string');
        expect(data.updated_at).to.be.a('string');
        done();
      });
    });
  });
  
  it("ensure non-existant pipeline couplings return a 404.", function(done) {
    httph.request('get', 'http://localhost:5000/pipelines/non-existant-pipeline/pipeline-couplings', alamo_headers, null, function(err, data) {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(404);
      expect(data).to.be.null;
      done();
    })
  });
  
  it("ensure pipeline couplings return a blank array if pipeline exists without couplings.", function(done) {
    httph.request('get', 'http://localhost:5000/pipelines/test-pipeline/pipeline-couplings', alamo_headers, null, function(err, data) {
      expect(err).to.be.null
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      expect(data.length).to.equal(0);
      done();
    })
  });
  
  it("covers getting pipline", function(done) {
    httph.request('get','http://localhost:5000/pipelines/test-pipeline', alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.name).to.be.a('string');
      expect(data.id).to.be.a('string');
      expect(data.created_at).to.be.a('string');
      expect(data.updated_at).to.be.a('string');
      done();
    });
  });

  it("covers listing piplines", function(done) {
    httph.request('get','http://localhost:5000/pipelines', alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data).to.be.an('array');
      data.forEach(function(datum) {
        expect(datum.name).to.be.a('string');
        expect(datum.id).to.be.a('string');
        expect(datum.created_at).to.be.a('string');
        expect(datum.updated_at).to.be.a('string');
      });
      done();
    });
  });

  it("covers not allowing duplicate piplines", function(done) {
    httph.request('post','http://localhost:5000/pipelines', alamo_headers, JSON.stringify({name:'test-pipeline'}), function(err, data) {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      done();
    });
  });
  // create three spaces
  it("dependency on having spaces for pipelines (first).", function(done) {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"pipline-test-space1", description:"test space for pipelines (1)"}),
    function(err, data) {
      // dont care if it fails or succeeds, the space creation is already
      // covered, assume it succeeded, as we dont have the ability to test deleting spaces.
      done();
    });
  });
  it("dependency on having spaces for pipelines (second).", function(done) {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"pipline-test-space2", description:"test space for pipelines (2)"}),
    function(err, data) {
      // dont care if it fails or succeeds, the space creation is already
      // covered, assume it succeeded, as we dont have the ability to test deleting spaces.
      done();
    });
  });
  it("dependency on having spaces for pipelines (third).", function(done) {
    httph.request('post', 'http://localhost:5000/spaces', alamo_headers, JSON.stringify({name:"pipline-test-space3", description:"test space for pipelines (3)"}),
    function(err, data) {
      // dont care if it fails or succeeds, the space creation is already
      // covered, assume it succeeded, as we dont have the ability to test deleting spaces.
      done();
    });
  });

  it("creating multiple apps for pipelining (1).", function(done) {
    this.timeout(0);
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:'pipline-test-space1', name:app1, size:"constellation", quantity:1, "type":"web", port:5000}),
      function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        // create the first build
        httph.request('post', 'http://localhost:5000/apps/' + app1 + '-pipline-test-space1/builds', alamo_headers, JSON.stringify(pipeline1_sources), function(err, build_info) {
          if(err) {
            console.log(err);
          }
          expect(err).to.be.null;
          let build_obj = JSON.parse(build_info);
          expect(build_obj.id).to.be.a('string');
          // wait for the build to succeed
          wait_for_pipeline_build(httph, app1 + '-pipline-test-space1', build_obj.id, function(wait_err, building_info) {
            expect(wait_err).to.be.null;
            httph.request('post', 'http://localhost:5000/apps/' + app1 + '-pipline-test-space1/releases', alamo_headers, JSON.stringify({"slug":build_obj.id,"description":"Deploy " + build_obj.id}), function(release_err, release_info) {
              expect(err).to.be.null;
              expect(release_info).to.be.a('string');
              release_info = JSON.parse(release_info);
              expect(release_info.id).to.be.a('string');
              pipeline1_release_id = release_info.id;
              setTimeout(function() {
                wait_for_app_content(httph, app1 + '-pipline-test-space1', 'pipeline1', function(wait_app_err, resp) {
                  if(wait_app_err) {
                    console.log(wait_app_err);
                  }
                  expect(wait_app_err).to.be.null;
                  expect(resp).to.equal('pipeline1');
                  done();
                });
              }, 1000);
            });
          });
        });
      });
  });

  it("creating multiple apps for pipelining (2).", function(done) {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:'pipline-test-space1', name:app2}),
      function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });

  it("creating multiple apps for pipelining (3).", function(done) {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:'pipline-test-space2', name:app3}),
      function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });

  it("creating multiple apps for pipelining (4).", function(done) {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({org:"test", space:'pipline-test-space3', name:app4}),
      function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });

  it("creating pipeline coupling between app1 and app2 in same space.", function(done) {
    httph.request('post', 'http://localhost:5000/pipeline-couplings', alamo_headers,
      JSON.stringify({"app":app1 + '-pipline-test-space1', "pipeline":"test-pipeline", "stage":"review"}),
      function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        httph.request('post', 'http://localhost:5000/pipeline-couplings', alamo_headers,
          JSON.stringify({"app":app2 + '-pipline-test-space1', "pipeline":"test-pipeline", "stage":"development"}),
          function(err, data) {
            if(err) {
              console.error(err);
            }
            expect(err).to.be.null;
            done();
        });
    });
  });

  it("creating pipeline coupling between app2 -> app3 and app4 in separate spaces.", function(done) {
    httph.request('post', 'http://localhost:5000/pipeline-couplings', alamo_headers,
      JSON.stringify({"app":app3 + '-pipline-test-space2', "pipeline":"test-pipeline", "stage":"staging"}),
      function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        httph.request('post', 'http://localhost:5000/pipeline-couplings', alamo_headers,
          JSON.stringify({"app":app4 + '-pipline-test-space3', "pipeline":"test-pipeline", "stage":"staging"}),
          function(err, data) {
            if(err) {
              console.error(err);
            }
            expect(err).to.be.null;
            done();
        });
    });
  });

  it("ensure couplings are present in list.", function(done) {
    httph.request('get', 'http://localhost:5000/pipelines/test-pipeline/pipeline-couplings', alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      data = JSON.parse(data);
      let found_app1 = false;
      let found_app2 = false;
      let found_app3 = false;
      let found_app4 = false;
      data.forEach(function(coupling) {
        if(coupling.app.name === (app1 + '-pipline-test-space1') ) {
          found_app1 = true;
          pipeline_id = coupling.pipeline.id;
          app1_id = coupling.app.id;
          app1_coupling_id = coupling.id;
        } else if (coupling.app.name === (app2 + '-pipline-test-space1') ) {
          found_app2 = true;
          app2_coupling_id = coupling.id;
          app2_id = coupling.app.id;
        } else if (coupling.app.name === (app3 + '-pipline-test-space2') ) {
          found_app3 = true;
          app3_coupling_id = coupling.id;
          app3_id = coupling.app.id;
        } else if (coupling.app.name === (app4 + '-pipline-test-space3') ) {
          found_app4 = true;
          app4_coupling_id = coupling.id;
          app4_id = coupling.app.id;
        }
      });
      expect(found_app1).to.equal(true);
      expect(found_app2).to.equal(true);
      expect(found_app3).to.equal(true);
      expect(found_app4).to.equal(true);
      done();
    });
  });

  // use case: pipeline to the same space one to one
  let pipeline_promotion_id = null;
  it("covers promoting one app to another in the same space.", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers,
      JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}),
    function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.status).to.equal('successful');
      expect(data.id).to.be.a('string');
      pipeline_promotion_id = data.id;
      wait_for_app_content(httph, app2 + '-pipline-test-space1', 'pipeline1', function(wait_app_err, resp) {
        if(wait_app_err) {
          console.log(wait_app_err);
        }
        expect(wait_app_err).to.be.null;
        expect(resp).to.equal('pipeline1');
        done();
      });
    });
  });

  // use case: pipeline to multiple spaces
  //           pipeline a build from another pipelined build.
  //           pipeline one to many but only one promotion
  it("covers promoting one app to multiple apps.", function(done) {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(app3_coupling_id).to.be.a('string');
    expect(app4_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers,
      JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app2_id}}, targets:[{app:{id:app3_id}},{app:{id:app4_id}}]}),
    function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.status).to.equal('successful');
      expect(data.id).to.be.a('string');
      wait_for_app_content(httph, app3 + '-pipline-test-space2', 'pipeline1', function(wait_app_err, resp) {
        if(wait_app_err) {
          console.log(wait_app_err);
        }
        expect(wait_app_err).to.be.null;
        expect(resp).to.equal('pipeline1');
        wait_for_app_content(httph, app4 + '-pipline-test-space3', 'pipeline1', function(wait_app_err2, resp2) {
          if(wait_app_err2) {
            console.log(wait_app_err2);
          }
          expect(wait_app_err2).to.be.null;
          expect(resp2).to.equal('pipeline1');
          // reset a config var, wait a bit to successfully deploy, then recheck.
          // add a config var
          httph.request('patch', 'http://localhost:5000/apps/' + app4 + '-pipline-test-space3/config-vars', alamo_headers, JSON.stringify({FOO:"BAR"}), function(err, data) {
            expect(err).to.be.null;
            let config_vars = JSON.parse(data);
            expect(config_vars).to.be.a('object');
            expect(config_vars.FOO).to.equal("BAR");
            wait_for_app_content(httph, app4 + '-pipline-test-space3', 'pipeline1', function(wait_app_err2, resp2) {
              if(wait_app_err2) {
                console.log(wait_app_err2);
              }
              expect(wait_app_err2).to.be.null;
              expect(resp2).to.equal('pipeline1');
              done();
            });
          });
        });
      });
    });
  });

  it("covers pulling promotions", function(done) {
    httph.request('get', 'http://localhost:5000/pipeline-promotions', alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      let found = false;
      data.forEach(function(e) {
        if(e.id === pipeline_promotion_id) {
          found = true;
        }
      });
      expect(found).to.equal(true);
      done();
    });
  });

  it("covers pulling a specific promotion", function(done) {
    expect(pipeline_promotion_id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/pipeline-promotions/' + pipeline_promotion_id, alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  it("covers pulling promotion targets", function(done) {
    expect(pipeline_promotion_id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/pipeline-promotions/' + pipeline_promotion_id + '/promotion-targets', alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  // Ensure the pipeline coupling end points work
  it("covers explicit pipeline coupling end point.", function(done) {
    expect(app1_coupling_id).to.be.a('string');
    httph.request('get', 'http://localhost:5000/pipeline-couplings/' + app1_coupling_id, alamo_headers, null, function(err, data) {
      expect(err).to.be.null;
      done();
    });
  });

  // Create a new build on the source app.
  it("creating a new build on the original source app.", function(done) {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(app3_coupling_id).to.be.a('string');
    expect(app4_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    // create the second build
    httph.request('post', 'http://localhost:5000/apps/' + app1 + '-pipline-test-space1/builds', alamo_headers, JSON.stringify(pipeline2_sources), function(err, build_info) {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;
      let build_obj = JSON.parse(build_info);
      expect(build_obj.id).to.be.a('string');
      // wait for the build to succeed
      wait_for_pipeline_build(httph, app1 + '-pipline-test-space1', build_obj.id, function(wait_err, building_info) {
        expect(wait_err).to.be.null;
        httph.request('post', 'http://localhost:5000/apps/' + app1 + '-pipline-test-space1/releases', alamo_headers, JSON.stringify({"slug":build_obj.id,"description":"Deploy " + build_obj.id}), function(release_err, release_info){
          expect(err).to.be.null;
          wait_for_app_content(httph, app1 + '-pipline-test-space1', 'pipeline2', function(wait_app_err, resp) {
            if(wait_app_err) {
              console.log(wait_app_err);
            }
            expect(wait_app_err).to.be.null;
            expect(resp).to.equal('pipeline2');
            done();
          });
        });
      });
    });
  });

  // Restart target apps and ensure they still have original first build.
  it("restarting/redeploying target pipelined apps, ensuring they still have original build", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(app3_coupling_id).to.be.a('string');
    expect(app4_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    // create the second build
    httph.request('delete', 'http://localhost:5000/apps/' + app4 + '-pipline-test-space3/dynos', alamo_headers, null, function(err, build_info) {
      if(err) {
        console.log(err);
      }
      expect(err).to.be.null;

      // wait for the app to restart
      setTimeout(function() {
        wait_for_app_content(httph, app4 + '-pipline-test-space3', 'pipeline1', function(wait_app_err, resp) {
          if(wait_app_err) {
            console.log(wait_app_err);
          }
          expect(wait_app_err).to.be.null;
          expect(resp).to.equal('pipeline1');
          done();
        });
      }, 5000);
    });
  });

  it("promote the second build", function(done) {
    this.timeout(0);
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers,
      JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}),
    function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.status).to.equal('successful');
      expect(data.id).to.be.a('string');
      setTimeout(function() {
        wait_for_app_content(httph, app2 + '-pipline-test-space1', 'pipeline2', function(wait_app_err, resp) {
          if(wait_app_err) {
            console.log(wait_app_err);
          }
          expect(wait_app_err).to.be.null;
          expect(resp).to.equal('pipeline2');
          // ensure app3 has pipeline2, but app4 still has pipeline1
          wait_for_app_content(httph, app3 + '-pipline-test-space2', 'pipeline1', function(wait_app_err3, resp) {
            if(wait_app_err3) {
              console.log(wait_app_err3);
            }
            expect(wait_app_err3).to.be.null;
            expect(resp).to.equal('pipeline1');
            wait_for_app_content(httph, app4 + '-pipline-test-space3', 'pipeline1', function(wait_app_err4, resp2) {
              if(wait_app_err4) {
                console.log(wait_app_err4);
              }
              expect(wait_app_err4).to.be.null;
              expect(resp2).to.equal('pipeline1');
              done();
            });
          });
        });
      }, 5000);
    });
  });

  it("promote the second build to the app3/app4", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    expect(app3_id).to.be.a('string');
    expect(app4_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers,
      JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app2_id}}, targets:[{app:{id:app3_id}},{app:{id:app4_id}}]}),
    function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.status).to.equal('successful');
      expect(data.id).to.be.a('string');
      setTimeout(function() {
        wait_for_app_content(httph, app2 + '-pipline-test-space1', 'pipeline2', function(wait_app_err, resp) {
          if(wait_app_err) {
            console.log(wait_app_err);
          }
          expect(wait_app_err).to.be.null;
          expect(resp).to.equal('pipeline2');
          // ensure app3 has pipeline2, but app4 now have pipeline2
          wait_for_app_content(httph, app3 + '-pipline-test-space2', 'pipeline2', function(wait_app_err3, resp) {
            if(wait_app_err3) {
              console.log(wait_app_err3);
            }
            expect(wait_app_err3).to.be.null;
            expect(resp).to.equal('pipeline2');
            wait_for_app_content(httph, app4 + '-pipline-test-space3', 'pipeline2', function(wait_app_err4, resp2) {
              if(wait_app_err4) {
                console.log(wait_app_err4);
              }
              expect(wait_app_err4).to.be.null;
              expect(resp2).to.equal('pipeline2');
              done();
            });
          });
        });
      }, 5000);
    });
  });

  it("re-promote the first build", function(done) {
    this.timeout(0)
    expect(pipeline1_release_id).to.be.a('string');
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers,
      JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app1_id, release:{id:pipeline1_release_id}}}, targets:[{app:{id:app2_id}}]}),
    function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      data = JSON.parse(data);
      expect(data.status).to.equal('successful');
      expect(data.id).to.be.a('string');
      setTimeout(function() {
        wait_for_app_content(httph, app1 + '-pipline-test-space1', 'pipeline2', function(wait_app_err, resp) {
          if(wait_app_err) {
            console.log(wait_app_err);
          }
          expect(wait_app_err).to.be.null;
          expect(resp).to.equal('pipeline2');
          wait_for_app_content(httph, app2 + '-pipline-test-space1', 'pipeline1', function(wait_app_err2, resp) {
            if(wait_app_err2) {
              console.log(wait_app_err2);
            }
            expect(wait_app_err2).to.be.null;
            expect(resp).to.equal('pipeline1');
            // ensure app3 & app4 still has pipeline1
            wait_for_app_content(httph, app3 + '-pipline-test-space2', 'pipeline2', function(wait_app_err3, resp) {
              if(wait_app_err3) {
                console.log(wait_app_err3);
              }
              expect(wait_app_err3).to.be.null;
              expect(resp).to.equal('pipeline2');
              wait_for_app_content(httph, app4 + '-pipline-test-space3', 'pipeline2', function(wait_app_err4, resp2) {
                if(wait_app_err4) {
                  console.log(wait_app_err4);
                }
                expect(wait_app_err4).to.be.null;
                expect(resp2).to.equal('pipeline2');
                done();
              });
            });
          });
        });
      }, 5000);
    });
  });

  it("covers ensuring safe promotions halt if source config is different than dest config and its a safe promotion.", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');

    httph.request('patch', 'http://localhost:5000/apps/' + app1_id + '/config-vars', alamo_headers, JSON.stringify({"TYPEAHEAD":"WHONEEDSIT?"}), function(err, data) {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers, JSON.stringify({safe:true, pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}), function(err, data) {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(422);
        expect(err.message.indexOf('Safe promotion was specified and this promotion has been deemed unsafe.') === 0).to.equal(true)
        done()
      });
    });
  });

  it("covers ensuring promotions do not halt if source config is different than dest config and its an unsafe promotion.", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers, JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}), function(err, data) {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      done()
    });
  });

  it("covers ensuring promotions do not halt if config is same and its unsafe.", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');

    httph.request('patch', 'http://localhost:5000/apps/' + app1_id + '/config-vars', alamo_headers, JSON.stringify({"TYPEAHEAD":null}), function(err, data) {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers, JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}), function(err, data) {
        if(err) {
          console.log(err)
        }
        expect(err).to.be.null;
        done()
      });
    });
  });


  it("covers ensuring safe promotions halt if destination config is different then source config and its a safe promotion.", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');

    httph.request('patch', 'http://localhost:5000/apps/' + app2_id + '/config-vars', alamo_headers, JSON.stringify({"TYPEAHEAD2":"WHONEEDSIT?"}), function(err, data) {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers, JSON.stringify({safe:true, pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}), function(err, data) {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(422);
        expect(err.message.indexOf('Safe promotion was specified and this promotion has been deemed unsafe.') === 0).to.equal(true)
        done()
      });
    });
  });

  it("covers ensuring promotions do not halt if destination config is different than source config and its an unsafe promotion.", function(done) {
    this.timeout(0)
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    expect(pipeline_id).to.be.a('string');
    expect(app1_id).to.be.a('string');
    expect(app2_id).to.be.a('string');
    httph.request('post','http://localhost:5000/pipeline-promotions', alamo_headers, JSON.stringify({pipeline:{id:pipeline_id}, source:{app:{id:app1_id}}, targets:[{app:{id:app2_id}}]}), function(err, data) {
      if(err) {
        console.log(err)
      }
      expect(err).to.be.null;
      done()
    });
  });


  // TODO:
  // use case: pipeline prod end pipeline and ensure its failure.
  // use case: pipeline one app with no target, ensure its failure.
  // use case: try and release on a pipelined app, ensure its failure.
  // use case: rollback a pipelined app, ensure it succeeds.

  it("covers removing couplings.", function(done) {
    expect(app1_coupling_id).to.be.a('string');
    httph.request('delete', 'http://localhost:5000/pipeline-couplings/' + app1_coupling_id, alamo_headers, null, function(err, data) {
      if(err) {
        console.error(err);
      }
      expect(err).to.be.null;
      done();
    });
  });

  it("covers being able to delete pipleines with active couplings", function(done) {
    expect(app1_coupling_id).to.be.a('string');
    expect(app2_coupling_id).to.be.a('string');
    httph.request('delete','http://localhost:5000/pipelines/test-pipeline', alamo_headers, null, function(err, data) {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });

  // Ensure the pipeline coupling was removed after the pipeline was removed.
  it("covers ensuring deleting pipeline deletes pipeline couplings.", function(done) {
    httph.request('get', 'http://localhost:5000/pipeline-couplings/' + app2_coupling_id, alamo_headers, null, function(err, data) {
      expect(err).to.be.an('object');
      expect(err.code).to.equal(404)
      done();
    });
  });

  it("removing multiple apps for pipelining (1).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app1 + '-pipline-test-space1', alamo_headers, null, function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });

  it("removing multiple apps for pipelining (2).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app2 + '-pipline-test-space1', alamo_headers, null, function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });

  it("removing multiple apps for pipelining (3).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app3 + '-pipline-test-space2', alamo_headers, null, function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });

  it("removing multiple apps for pipelining (4).", function(done) {
    httph.request('delete', 'http://localhost:5000/apps/' + app4 + '-pipline-test-space3', alamo_headers, null, function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        done();
      });
  });
});