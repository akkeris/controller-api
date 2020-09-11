/* eslint-disable no-unused-expressions */
describe('sites/routes', function () {
  this.timeout(300000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  const support = require('./support/init.js');
  process.env.TEST_MODE = 'true'; // DO NOT REMOVE THIS OTHERWISE THE TESTS WILL TRY AND DO REAL THINGS.
  const alamo_headers = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-username': 'test',
    'x-ignore-errors': 'true',
    'x-elevated-access': 'true',
  };
  const alamo_headers_bubble_errors = {
    Authorization: process.env.AUTH_KEY,
    'User-Agent': 'Hello',
    'x-username': 'test',
    'x-elevated-access': 'true',
    'x-silent-error': 'true',
  };
  const running_app = require('../index.js'); // eslint-disable-line
  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  let site_id; let
    route_id;
  const app_id = 'fa2b535d-de4d-4a14-be36-d44af53b59e3';
  const domain1 = `alamotestsite${getRandomInt(0, 9999)}${process.env.BASE_DOMAIN}`;
  const siteurl1 = `http://localhost:5000/sites/${domain1}`;

  let testapp1 = null;
  let testapp2 = null;
  let testapp3 = null;
  let testapp4 = null;


  it('covers creating test app for sites', async () => {
    this.timeout(500000);
    testapp1 = await support.create_test_app();
  });

  it('covers creating sites', async () => {
    this.timeout(30000);
    const payload = {
      domain: domain1,
      owner: 'owner',
      region: process.env.TEST_REGION,
      email: 'email@email.com',
      description: 'description',
      labels: 'label1,label2',
    };
    const data = await httph.request('post', 'http://localhost:5000/sites', alamo_headers, JSON.stringify(payload));
    const obj = JSON.parse(data);
    expect(obj.domain).to.equal(domain1);
    expect(obj.region.name).to.equal(process.env.TEST_REGION);
    site_id = obj.id;
  });

  it('covers listing sites', async () => {
    const data = await httph.request('get', 'http://localhost:5000/sites', alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    let test_site = null;
    obj.forEach((x) => {
      if (x.domain.indexOf(domain1) > -1) {
        test_site = x;
      }
    });
    expect(test_site.domain).to.equal(domain1);
    expect(test_site.region.name).to.a('string');
  });

  it(`covers getting site info ${siteurl1}`, async () => {
    this.timeout(30000);
    const data = await httph.request('get', siteurl1, alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj.domain).to.equal(domain1);
    expect(obj.region.name).to.equal(process.env.TEST_REGION);
    expect(obj.description).to.equal('description');
    expect(obj.labels).to.equal('label1,label2');
  });

  it(`covers updating site info ${siteurl1}`, async () => {
    this.timeout(30000);
    const payload = {
      description: 'new description',
      labels: 'label3,label4',
    };
    const data = await httph.request(
      'patch',
      `http://localhost:5000/sites/${siteurl1}`,
      alamo_headers,
      JSON.stringify(payload),
    );
    const obj = JSON.parse(data);
    expect(obj.description).to.equal(payload.description);
    expect(obj.labels).to.equal(payload.labels);
  });

  it('covers creating routes', async () => {
    this.timeout(30000);
    const payload = {
      app: app_id,
      site: site_id,
      source_path: '/source-path/foo.html',
      target_path: '/target-path/foo.html',
    };
    const data = await httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload));
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj.app.id).to.equal(app_id);
    expect(obj.site.id).to.equal(site_id);
    expect(obj.source_path).to.equal('/source-path/foo.html');
    expect(obj.target_path).to.equal('/target-path/foo.html');
    // pending is a race condition, could be true or false.. expect(obj.pending).to.equal(false)
    route_id = obj.id;
  });

  let route_for_app1 = null; let
    route_for_app2 = null;
  it('covers creating multiple routes', async () => {
    this.timeout(30000);
    let payload = {
      app: testapp1.id, site: site_id, source_path: '/source1', target_path: '/target1',
    };
    const data = await httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload));
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj.site.id).to.equal(site_id);
    expect(obj.source_path).to.equal('/source1');
    expect(obj.target_path).to.equal('/target1');
    expect(obj.pending).to.equal(true);
    route_for_app1 = obj.id;
    payload = {
      app: testapp1.id, site: site_id, source_path: '/source2', target_path: '/target2',
    };
    const data2 = await httph.request('post', `${siteurl1}/routes`, alamo_headers, JSON.stringify(payload));
    const obj2 = JSON.parse(data2);
    expect(obj2.site.id).to.equal(site_id);
    expect(obj2.source_path).to.equal('/source2');
    expect(obj2.target_path).to.equal('/target2');
    expect(obj2.pending).to.equal(true);
    route_for_app2 = obj2.id;
  });

  it('covers listing routes', async () => {
    this.timeout(30000);
    const data = await httph.request('get', `${siteurl1}/routes`, alamo_headers, null);
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    let test_route = null;
    obj.forEach((x) => {
      try {
        if (x.id === route_id) {
          test_route = x;
        }
      } catch (e) {
        console.error(e);
      }
    });
    expect(test_route).to.be.an('object');
    expect(test_route.app.name).to.equal('api-default');
    expect(test_route.source_path).to.equal('/source-path/foo.html');
    expect(test_route.target_path).to.equal('/target-path/foo.html');
  });

  it('covers listing routes by app', async () => {
    this.timeout(30000);
    const data = await httph.request('get', `http://localhost:5000/apps/${app_id}/routes`, alamo_headers, null);
    expect(data).to.be.a('string');
  });

  it('covers getting route info', async () => {
    this.timeout(30000);
    const data = await httph.request('get', `${siteurl1}/routes/${route_id}`, alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj.app.id).to.equal(app_id);
    expect(obj.site.id).to.equal(site_id);
    expect(obj.source_path).to.equal('/source-path/foo.html');
    expect(obj.target_path).to.equal('/target-path/foo.html');
  });

  it('covers ensuring routes are removed when app is deleted.', async () => {
    await support.delete_app(testapp1);
  });
  it('covers ensuring routes were deleted when app was removed.', async () => {
    this.timeout(30000);
    const data = await httph.request('get', `${siteurl1}/routes`, alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    let route1 = null; let
      route2 = null;
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
  });

  it('covers deleting route', async () => {
    this.timeout(30000);
    await httph.request('delete', `${siteurl1}/routes/${route_id}`, alamo_headers, null);
  });

  it('covers ensuring route was deleted', async () => {
    this.timeout(30000);
    const data = await httph.request('get', `${siteurl1}/routes`, alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    let test_route = null;
    obj.forEach((x) => {
      if (x.name === site_id) {
        test_route = x;
      }
    });
    expect(test_route).to.equal(null);
  });

  it('covers ensuring we get a 404 on deleted route', async () => {
    this.timeout(30000);
    const data = await httph.request('get', `${siteurl1}/routes/${route_id}`, alamo_headers, null);
    expect(data).to.be.undefined;
  });

  it('covers deleting site', async () => {
    this.timeout(30000);
    await httph.request('delete', siteurl1, alamo_headers, null);
  });

  it('covers ensuring site was deleted', async () => {
    this.timeout(30000);
    const data = await httph.request('get', 'http://localhost:5000/sites', alamo_headers, null);
    expect(data).to.be.a('string');
    const obj = JSON.parse(data);
    expect(obj).to.be.an('array');
    let test_site = null;
    obj.forEach((x) => {
      if (x.name === site_id) {
        test_site = x;
      }
    });
    expect(test_site).to.equal(null);
  });

  it('covers ensuring we get a 404 on deleted site', async () => {
    this.timeout(30000);
    const data = await httph.request('get', siteurl1, alamo_headers, null);
    expect(data).to.be.undefined;
  });


  it('covers creating new apps', async () => {
    this.timeout(500000);
    testapp2 = await support.create_test_app_with_content('testapp2');
    testapp3 = await support.create_test_app_with_content('testapp3');
  });

  const new_site = `alamotestsite${getRandomInt(0, 9999)}${process.env.BASE_DOMAIN}`;
  it('covers creating new sites', async () => {
    this.timeout(30000);
    expect(process.env.BASE_DOMAIN).to.be.a.string;
    const payload = {
      domain: new_site, owner: 'owner', region: process.TEST_REGION, email: 'email@email.com', description: 'description',
    };
    const data = await httph.request('post', 'http://localhost:5000/sites', alamo_headers, JSON.stringify(payload));
    const obj = JSON.parse(data);
    expect(obj.domain).to.equal(new_site);
    expect(obj.region.name).to.equal(process.env.TEST_REGION);
    site_id = obj.id;
  });

  it("covers adding 'default' route", async () => {
    const payload = {
      app: testapp2.id, site: new_site, source_path: '/', target_path: '/',
    };
    await httph.request('post', `http://localhost:5000/sites/${new_site}/routes`, alamo_headers, JSON.stringify(payload));
  });

  it("covers checking 'default' route", async () => {
    await support.wait(25000) // wait for DNS propagation
    await support.wait_for_app_content(`https://${new_site}/testing123`, 'testapp2');
  });

  it("covers adding 'override' route", async () => {
    const payload = {
      app: testapp3.id, site: new_site, source_path: '/override', target_path: '/',
    };
    await httph.request('post', `http://localhost:5000/sites/${new_site}/routes`, alamo_headers, JSON.stringify(payload));
  });

  it('covers ensuring routes with the same source path and same target path arent allowed', async () => {
    try {
      const payload = {
        app: testapp3.id, site: new_site, source_path: '/override', target_path: '/',
      };
      await httph.request(
        'post',
        `http://localhost:5000/sites/${new_site}/routes`,
        alamo_headers_bubble_errors,
        JSON.stringify(payload),
      );
      expect(true).to.equal(false);
    } catch (e) { /* ignore */ }
  });

  it('covers ensuring routes with the same source path but different target path arent allowed', async () => {
    try {
      const payload = {
        app: testapp3.id, site: new_site, source_path: '/override', target_path: '/abc',
      };
      await httph.request(
        'post',
        `http://localhost:5000/sites/${new_site}/routes`,
        alamo_headers_bubble_errors,
        JSON.stringify(payload),
      );
      expect(true).to.equal(false);
    } catch (e) { /* ignore */ }
  });

  it('covers ensuring routes with the same source path but different target path and different app arent allowed', async () => {
    try {
      const payload = {
        app: testapp2.id, site: new_site, source_path: '/override', target_path: '/abc123',
      };
      await httph.request(
        'post',
        `http://localhost:5000/sites/${new_site}/routes`,
        alamo_headers_bubble_errors,
        JSON.stringify(payload),
      );
      expect(true).to.equal(false);
    } catch (e) { /* ignore */ }
  });

  it("covers checking 'override' route", async () => {
    await support.wait_for_app_content(`https://${new_site}/override`, 'testapp3');
  });

  it("covers checking 'override' downstream route", async () => {
    await support.wait_for_app_content(`https://${new_site}/override/downstream`, 'testapp3');
  });

  it("covers ensuring 'default' route still works", async () => {
    await support.wait_for_app_content(`https://${new_site}/`, 'testapp2');
    await support.wait_for_app_content(`https://${new_site}/abdsafasd`, 'testapp2');
  });

  it('covers creating app without release and adding it as a route', async () => {
    this.timeout(500000);
    testapp4 = await support.create_test_app();
    const payload = {
      app: testapp4.id, site: new_site, source_path: '/fugazi', target_path: '/',
    };
    await httph.request('post', `http://localhost:5000/sites/${new_site}/routes`, alamo_headers, JSON.stringify(payload));
  });


  it('covers ensuring routes still work', async () => {
    await support.wait_for_app_content(`https://${new_site}/foo`, 'testapp2');
    await support.wait_for_app_content(`https://${new_site}/override`, 'testapp3');
  });

  it('covers bringing up test app 4 to see if route is automatically added', async () => {
    this.timeout(500000);
    await support.wait_for_app_content(`https://${new_site}/fugazi`, 'testapp2');
    await support.create_app_content('testapp4', 'default', testapp4);
    const release = await support.latest_release(testapp4);
    // fake out a released event call.
    httph.request('post', 'http://localhost:5000/events', alamo_headers, JSON.stringify({
      app: { name: testapp4.simple_name },
      space: { name: testapp4.space.name },
      key: testapp4.name,
      release: { id: release.id },
      action: 'released',
      slug: { image: '' },
      released_at: (new Date(Date.now())).toISOString(),
    }));
    // wait for the route to appear
    await support.wait_for_app_content(`https://${new_site}/fugazi`, 'testapp4');
    // double check we didn't break old routes.
    await support.wait_for_app_content(`https://${new_site}/foo`, 'testapp2');
    await support.wait_for_app_content(`https://${new_site}/override`, 'testapp3');
  });


  it('covers removing second site', async () => {
    this.timeout(30000);
    await httph.request('delete', `http://localhost:5000/sites/${new_site}`, alamo_headers, null);
  });

  it('covers removing remaining apps.', async () => {
    await support.delete_app(testapp2);
    await support.delete_app(testapp3);
    await support.delete_app(testapp4);
  });
});
