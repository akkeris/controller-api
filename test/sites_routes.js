"use strict";

describe("sites/routes", function () {
    this.timeout(10000);
    process.env.PORT = 5000;
    process.env.AUTH_KEY = 'hello';
    process.env.TEST_MODE = "true"; // DO NOT REMOVE THIS OTHERWISE THE TESTS WILL TRY AND DO REAL THINGS.
    const alamo_headers = {"Authorization": process.env.AUTH_KEY, "User-Agent": "Hello"};
    const running_app = require('../index.js');
    const httph = require('../lib/http_helper.js');
    const expect = require("chai").expect;

    let site_id, route_id;
    const app_id = 'fa2b535d-de4d-4a14-be36-d44af53b59e3';
    const domain1 = 'alamotestsite' + getRandomInt(0, 9999);
    const siteurl1 = `http://localhost:5000/sites/${domain1}`
    let app_name = "alamotest" + Math.floor(Math.random() * 10000)
    let app_key = app_name + '-default'

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function printErr(num, err){
        if (!err) return;
        if (typeof(err) == 'object')
            console.log(`!Error ${num}: ${err.message}`);
        else if (typeof(err) == 'string')
            console.log(`!Error ${num}: ${err}`);
    }

    it("covers creating test app for sites", function(done) {
      // create an app.
      httph.request('post', 'http://localhost:5000/apps', alamo_headers,
        JSON.stringify({org:"test", space:"default", name:app_name}),
      function(err, data) {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
      });
    });
    it("covers creating sites", (done) => {
        httph.request('post', 'http://localhost:5000/sites', alamo_headers, JSON.stringify({
              domain: domain1,
              owner: "owner",
              region: "us-seattle",
              email: "email@email.com",
              description: "description"
          }),
          (err, data) => {
              printErr(1, err)
              expect(err).to.be.null;
              expect(data).to.be.a('string');
              let obj = JSON.parse(data);
              expect(obj.domain).to.equal(domain1);
              expect(obj.region.name).to.equal('us-seattle');
              site_id = obj.id;
              done();
          });
    });
    it("covers listing sites", (done) => {
        httph.request('get', 'http://localhost:5000/sites', alamo_headers, null,
          (err, data) => {
            if(err) {
              console.error(err)
            }
              expect(err).to.be.null;
              expect(data).to.be.a('string');
              let obj = JSON.parse(data);
              expect(obj).to.be.an('array');
              let test_site = null;
              obj.forEach((x) => {
                  if (x.domain.indexOf(domain1) > -1) {
                      test_site = x;
                  }
              });
              expect(test_site.domain).to.equal(domain1);
              expect(test_site.region.name).to.a('string');
              done();
          });
    });
    it("covers getting site info " + siteurl1, (done) => {
        httph.request('get', siteurl1, alamo_headers, null,
          (err, data) => {
              printErr(3, err)
              expect(err).to.be.null;
              expect(data).to.be.a('string');
              let obj = JSON.parse(data);
              expect(obj.domain).to.equal(domain1);
              expect(obj.region.name).to.equal('us-seattle');
              done();
          });
    });
    it("covers creating routes", (done) => {
        let payload = {
            app: app_id,
            site: site_id,
            source_path: "/source",
            target_path: "/target"
        };
        httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload),
          (err, data) => {
              printErr(6, err)
              expect(err).to.be.null;
              expect(data).to.be.a('string');
              let obj = JSON.parse(data);
              expect(obj.app).to.equal(app_id);
              expect(obj.site).to.equal(site_id);
              expect(obj.source_path).to.equal("/source");
              expect(obj.target_path).to.equal("/target");
              route_id = obj.id
              done();
          });
    });

    let route_for_app1 = null, route_for_app2 = null;
    it("covers creating multiple routes", (done) => {
        let payload = {
            app: app_key,
            site: site_id,
            source_path: "/source1",
            target_path: "/target1"
        };
        httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload), (err, data) => {
          printErr(6, err)
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          let obj = JSON.parse(data);
          expect(obj.site).to.equal(site_id);
          expect(obj.source_path).to.equal("/source1");
          expect(obj.target_path).to.equal("/target1");
          route_for_app1 = obj.id;
          payload = {
            app: app_key,
            site: site_id,
            source_path: "/source2",
            target_path: "/target2"
          };
          httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload), (err, data) => {
            printErr(6, err)
            expect(err).to.be.null;
            expect(data).to.be.a('string');
            let obj2 = JSON.parse(data);
            expect(obj2.site).to.equal(site_id);
            expect(obj2.source_path).to.equal("/source2");
            expect(obj2.target_path).to.equal("/target2");
            route_for_app2 = obj2.id;
            done();
          });
        });
    });
    it("covers listing routes", (done) => {
        httph.request('get', `${siteurl1}/routes`, alamo_headers, null,
          (err, data) => {
            printErr(7, err)
            expect(err).to.be.null;
            expect(data).to.be.a('string');
            let obj = JSON.parse(data);
            expect(obj).to.be.an('array');
            let test_route = null;
            obj.forEach((x) => {
                if (x.id === route_id) {
                    test_route = x;
                }
            });
            expect(test_route).to.be.an('object');
            expect(test_route.app).to.equal('api-default');
            expect(test_route.source_path).to.equal('/source');
            expect(test_route.target_path).to.equal('/target');
            done();
          });
    });
    
    it("covers listing routes by app", (done) => {
      httph.request('get', `http://localhost:5000/apps/${app_id}/routes`, alamo_headers, null, (err, data) => { 
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
      });
    });

    it("covers getting route info", (done) => {
      httph.request('get', `${siteurl1}/routes/${route_id}`, alamo_headers, null, (err, data) => {
        printErr(8, err)
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.app).to.equal(app_id);
        expect(obj.site).to.equal(site_id);
        expect(obj.source_path).to.equal("/source");
        expect(obj.target_path).to.equal("/target");
        done();
      });
    });

    it("covers ensuring routes are removed when app is deleted.", (done) => {
      // destroy the app.
      httph.request('delete', 'http://localhost:5000/apps/' + app_key, alamo_headers, null, function(err, data) {
        if(err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
      });
    });


    it("covers ensuring routes were deleted when app was removed.", (done) => {
      httph.request('get', `${siteurl1}/routes`, alamo_headers, null, (err, data) => {
        printErr(7, err)
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let route1 = null, route2 = null;
        obj.forEach((x) => {
            if (x.id === route_for_app1) {
                route1 = x;
            }
            if (x.id === route_for_app2) {
                route2 = x;
            }
        });
        expect(route1).to.be.null;
        expect(route2).to.be.null;
        done();
      });
    });

    it("covers deleting route", (done) => {
      httph.request('delete', `${siteurl1}/routes/${route_id}`, alamo_headers, null, (err, data) => {
        printErr(11, err)
        expect(err).to.be.null;
        done();
      });
    });

    it("covers ensuring route was deleted", (done) => {
      httph.request('get', `${siteurl1}/routes`, alamo_headers, null, (err, data) => {
        printErr(12, err)
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let test_route = null;
        obj.forEach((x) => {
            if (x.name === site_id) {
                test_route = x;
            }
        });
        expect(test_route).to.equal(null);
        done();
      });
    });

    it("covers ensuring we get a 404 on deleted route", (done) => {
        httph.request('get', `${siteurl1}/routes/${route_id}`, alamo_headers, null,
          (err, data) => {
              expect(err).to.be.an('object');
              expect(err.code).to.equal(404);
              expect(data).to.be.null;
              done();
          });
    });

    it("covers deleting site", (done) => {
        httph.request('delete', siteurl1, alamo_headers, null, (err, data) => {
          printErr(14, err)
          expect(err).to.be.null;
          done();
        });
    });

    it("covers ensuring site was deleted", (done) => {
        httph.request('get', 'http://localhost:5000/sites', alamo_headers, null, (err, data) => {
          printErr(15, err)
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          let obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          let test_site = null;
          obj.forEach((x) => {
              if (x.name === site_id) {
                  test_site = x;
              }
          });
          expect(test_site).to.equal(null);
          done();
        });
    });
    it("covers ensuring we get a 404 on deleted site", (done) => {
        httph.request('get', siteurl1, alamo_headers, null, (err, data) => {
          expect(err).to.be.an('object');
          expect(err.code).to.equal(404);
          expect(data).to.be.null;
          done();
        });
    });
});