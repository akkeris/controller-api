"use strict";

describe("sites/routes", function () {
    this.timeout(300000);
    process.env.PORT = 5000;
    process.env.AUTH_KEY = 'hello';
    const support = require('./support/init.js');
    process.env.TEST_MODE = "true"; // DO NOT REMOVE THIS OTHERWISE THE TESTS WILL TRY AND DO REAL THINGS.
    const alamo_headers = {"Authorization": process.env.AUTH_KEY, "User-Agent": "Hello", "x-username":"test", "x-elevated-access":"true", 'x-ignore-errors':'true'};
    const running_app = require('../index.js');
    const httph = require('../lib/http_helper.js');
    const expect = require("chai").expect;

    let site_id, route_id;
    const app_id = 'fa2b535d-de4d-4a14-be36-d44af53b59e3';
    const domain1 = 'alamotestsite' + getRandomInt(0, 9999);
    const siteurl1 = `http://localhost:5000/sites/${domain1}`;

    let testapp1 = null;
    let testapp2 = null;
    let testapp3 = null;
    let testapp4 = null;

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    it("covers creating test app for sites", async (done) => {
      this.timeout(500000)
      try {
        testapp1 = await support.create_test_app();
        done();
      } catch (e) { 
        done(e);
      }
    });
    it("covers creating sites", async (done) => {
      this.timeout(30000)
      try {
        let payload = { domain: domain1, owner: "owner", region: "us-seattle", email: "email@email.com", description: "description" };
        let data = await httph.request('post', 'http://localhost:5000/sites', alamo_headers, JSON.stringify(payload));
        let obj = JSON.parse(data);
        expect(obj.domain).to.equal(domain1);
        expect(obj.region.name).to.equal('us-seattle');
        site_id = obj.id;
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers listing sites", async (done) => {
      try {
        let data = await httph.request('get', 'http://localhost:5000/sites', alamo_headers, null);  
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
      } catch (e) {
        done(e);
      }
    });

    it(`covers getting site info ${siteurl1}`, async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', siteurl1, alamo_headers, null);
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.domain).to.equal(domain1);
        expect(obj.region.name).to.equal('us-seattle');
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers creating routes", async (done) => {
      try {
        this.timeout(30000)
        let payload = {
            app: app_id,
            site: site_id,
            source_path: "/source-path/foo.html",
            target_path: "/target-path/foo.html"
        };
        let data = await httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload));
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.app.id).to.equal(app_id);
        expect(obj.site.id).to.equal(site_id);
        expect(obj.source_path).to.equal("/source-path/foo.html");
        expect(obj.target_path).to.equal("/target-path/foo.html");
        expect(obj.pending).to.equal(false);
        route_id = obj.id
        done();
      } catch (e) {
        done(e);
      }
    });

    let route_for_app1 = null, route_for_app2 = null;
    it("covers creating multiple routes", async (done) => {
      try {
        this.timeout(30000)
        let payload = { app: testapp1.id, site: site_id, source_path: "/source1", target_path: "/target1" };
        let data = await httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload));
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.site.id).to.equal(site_id);
        expect(obj.source_path).to.equal("/source1");
        expect(obj.target_path).to.equal("/target1");
        expect(obj.pending).to.equal(true);
        route_for_app1 = obj.id;
        payload = { app: testapp1.id, site: site_id, source_path: "/source2", target_path: "/target2" };
        let data2 = await httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload))
        let obj2 = JSON.parse(data2);
        expect(obj2.site.id).to.equal(site_id);
        expect(obj2.source_path).to.equal("/source2");
        expect(obj2.target_path).to.equal("/target2");
        expect(obj2.pending).to.equal(true);
        route_for_app2 = obj2.id;
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers listing routes", async (done) => {
      this.timeout(30000)
      let data = await httph.request('get', `${siteurl1}/routes`, alamo_headers, null);
      let obj = JSON.parse(data);
      expect(obj).to.be.an('array');
      let test_route = null;
      obj.forEach((x) => {
          if(x.id === route_id) {
            test_route = x;
          }
      });
      expect(test_route).to.be.an('object');
      expect(test_route.app.name).to.equal('api-default');
      expect(test_route.source_path).to.equal('/source-path/foo.html');
      expect(test_route.target_path).to.equal('/target-path/foo.html');
      done();
    });
    
    it("covers listing routes by app", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', `http://localhost:5000/apps/${app_id}/routes`, alamo_headers, null);
        expect(data).to.be.a('string');
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers getting route info", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', `${siteurl1}/routes/${route_id}`, alamo_headers, null);
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.app.id).to.equal(app_id);
        expect(obj.site.id).to.equal(site_id);
        expect(obj.source_path).to.equal("/source-path/foo.html");
        expect(obj.target_path).to.equal("/target-path/foo.html");
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers ensuring routes are removed when app is deleted.", async (done) => {
      try {
        await support.delete_app(testapp1);
        done();
      } catch (e) {
        done(e);
      }
    });
    it("covers ensuring routes were deleted when app was removed.", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', `${siteurl1}/routes`, alamo_headers, null);
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
      } catch (e) {
        done(e);
      }
    });

    it("covers deleting route", async (done) => {
      try {
        this.timeout(30000)
        await httph.request('delete', `${siteurl1}/routes/${route_id}`, alamo_headers, null);
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers ensuring route was deleted", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', `${siteurl1}/routes`, alamo_headers, null);
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
      } catch (e) {
        done(e);
      }
    });

    it("covers ensuring we get a 404 on deleted route", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', `${siteurl1}/routes/${route_id}`, alamo_headers, null);
        expect(data).to.be.undefined;
        done();
      } catch (err) {
        done(err);
      }
    });

    it("covers deleting site", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('delete', siteurl1, alamo_headers, null);
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers ensuring site was deleted", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', 'http://localhost:5000/sites', alamo_headers, null);
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
      } catch (e) {
        done(e);
      }
    });

    it("covers ensuring we get a 404 on deleted site", async (done) => {
      try {
        this.timeout(30000)
        let data = await httph.request('get', siteurl1, alamo_headers, null);
        expect(data).to.be.undefined;
        done();
      } catch (err) {
        done(err);
      }
    });


    it("covers creating new apps", async (done) => {
      this.timeout(500000)
      try {
        testapp2 = await support.create_test_app_with_content('testapp2');
        testapp3 = await support.create_test_app_with_content('testapp3');
        done();
      } catch (e) { 
        done(e);
      }
    });

    const new_site = 'alamotestsite' + getRandomInt(0, 9999) + process.env.BASE_DOMAIN;
    it("covers creating new sites", async (done) => {
      this.timeout(30000)
      try {
        expect(process.env.BASE_DOMAIN).to.be.a.string;
        let payload = { domain: new_site, owner: "owner", region: "us-seattle", email: "email@email.com", description: "description" };
        let data = await httph.request('post', 'http://localhost:5000/sites', alamo_headers, JSON.stringify(payload));
        let obj = JSON.parse(data);
        expect(obj.domain).to.equal(new_site);
        expect(obj.region.name).to.equal('us-seattle');
        site_id = obj.id;
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers adding 'default' route", async (done) => {
      setTimeout(async () => {
        try {
          let payload = { app: testapp2.id, site: new_site, source_path: "/", target_path: "/" };
          await httph.request('post', `http://localhost:5000/sites/${new_site}/routes`, alamo_headers, JSON.stringify(payload));
          done()
        } catch (e) {
          done(e)
        }
      }, 15000)
    });

    it("covers checking 'default' route", async (done) => {
      try {
        await support.wait_for_app_content(`https://${new_site}/testing123`, 'testapp2');
        done()
      } catch (e) {
        done(e)
      }
    });

    it("covers adding 'override' route", async (done) => {
      try {
        let payload = { app: testapp3.id, site: new_site, source_path: "/override", target_path: "/" };
        await httph.request('post', `http://localhost:5000/sites/${new_site}/routes`, alamo_headers, JSON.stringify(payload));
        done()
      } catch (e) {
        done(e)
      }
    });

    it("covers checking 'override' route", async (done) => {
      try {
        await support.wait_for_app_content(`https://${new_site}/override`, 'testapp3');
        done()
      } catch (e) {
        done(e)
      }
    });

    it("covers checking 'override' downstream route", async (done) => {
      try {
        await support.wait_for_app_content(`https://${new_site}/override/downstream`, 'testapp3');
        done()
      } catch (e) {
        done(e)
      }
    });

    it("covers ensuring 'default' route still works", async (done) => {
      try {
        await support.wait_for_app_content(`https://${new_site}/`, 'testapp2');
        await support.wait_for_app_content(`https://${new_site}/abdsafasd`, 'testapp2');
        done()
      } catch (e) {
        done(e)
      }
    });

    it("covers creating app without release and adding it as a route", async (done) => {
      this.timeout(500000)
      try {
        testapp4 = await support.create_test_app();
        let payload = { app: testapp4.id, site: new_site, source_path: "/fugazi", target_path: "/" };
        await httph.request('post', `http://localhost:5000/sites/${new_site}/routes`, alamo_headers, JSON.stringify(payload));
        done();
      } catch (e) { 
        done(e);
      }
    });


    it("covers ensuring routes still work", async (done) => {
      try {
        await support.wait_for_app_content(`https://${new_site}/foo`, 'testapp2');
        await support.wait_for_app_content(`https://${new_site}/override`, 'testapp3');
        done()
      } catch (e) {
        done(e)
      }
    });

    it("covers bringing up test app 4 to see if route is automatically added", async (done) => {
      this.timeout(500000)
      try {
        await support.wait_for_app_content(`https://${new_site}/fugazi`, 'testapp2');
        await support.create_app_content('testapp4', 'default', testapp4);
        // fake out a released event call. 
        httph.request('post', 'http://localhost:5000/events', alamo_headers, JSON.stringify({"app":{"name":testapp4.simple_name}, "space":{"name":testapp4.space.name}, "key":testapp4.name, "action":"released", "slug":{"image":""}, "released_at":(new Date(Date.now())).toISOString()}))
        // wait for the route to appear
        await support.wait_for_app_content(`https://${new_site}/fugazi`, 'testapp4');
        // double check we didn't break old routes.
        await support.wait_for_app_content(`https://${new_site}/foo`, 'testapp2');
        await support.wait_for_app_content(`https://${new_site}/override`, 'testapp3');
        done();
      } catch (e) { 
        done(e);
      }
    });


    it("covers removing second site", async (done) => {
      try {
        this.timeout(30000)
        await httph.request('delete', `http://localhost:5000/sites/${new_site}`, alamo_headers, null);
        done();
      } catch (e) {
        done(e);
      }
    });

    it("covers removing remaining apps.", async (done) => {
      try {
        await support.delete_app(testapp2);
        await support.delete_app(testapp3);
        await support.delete_app(testapp4);
        done();
      } catch (e) {
        done(e);
      }
    });
});