/* eslint-disable no-unused-expressions */
process.env.DEFAULT_PORT = '5000';
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const { expect } = require('chai');
const init = require('./support/init.js'); // eslint-disable-line
const httph = require('../lib/http_helper.js');

const alamo_headers = {
  Authorization: process.env.AUTH_KEY,
  'User-Agent': 'Hello',
  'x-username': 'test',
  'x-elevated-access': 'true',
};

// function wait_for_app(httph, app, callback, iteration) {
//   iteration = iteration || 1;
//   if (iteration === 1) {
//     process.stdout.write('    ~ Waiting for app to turn up');
//   }
//   if (iteration === 30) {
//     process.stdout.write('\n');
//     callback({ code: 0, message: 'Timeout waiting for app to turn up.' });
//   }
//   httph.request('get', `https://${app}${process.env.ALAMO_BASE_DOMAIN}`, { 'X-Timeout': 500 }, null, (err, data) => {
//     if (err) {
//       process.stdout.write('.');
//       setTimeout(wait_for_app.bind(null, httph, app, callback, (iteration + 1)), 500);
//       // callback(err, null);
//     } else {
//       process.stdout.write('\n');
//       callback(null, data);
//     }
//   });
// }

// function wait_for_build(httph, app, build_id, callback, iteration) {
//   iteration = iteration || 1;
//   if (iteration === 1) {
//     process.stdout.write('    ~ Waiting for build');
//   }
//   httph.request('get', `http://localhost:5000/apps/${app}/builds/${build_id}`, alamo_headers, null, (err, data) => {
//     if (err && err.code === 423) {
//       process.stdout.write('.');
//       setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
//     } else if (err) {
//       callback(err, null);
//     } else {
//       const build_info = JSON.parse(data);
//       if (build_info.status === 'pending') {
//         process.stdout.write('.');
//         setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
//       } else {
//         process.stdout.write('\n');
//         callback(null, data);
//       }
//     }
//   });
// }

describe('addons: provisioning postgres, redis, influx, and cassandra services.', function () {
  this.timeout(100000);

  const appname_brand_new = `alamotest${Math.floor(Math.random() * 10000)}`;

  it('covers creating the test app for services', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({ org: 'test', space: 'default', name: appname_brand_new }),
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        setTimeout(done, 500);
      });
  });


  let postgres_plan = null;
  let redis_plan = null;
  let es_plan = null;
  let influxdb_plan = null;
  let cassandra_plan = null;
  let postgres_response = null;
  let redis_response = null;
  let influxdb_response = null;
  let cassandra_response = null;

  if (process.env.SMOKE_TESTS) {
    it('covers getting a influxdb plans', (done) => {
      httph.request('get', 'http://localhost:5000/addon-services/alamo-influxdb/plans', alamo_headers, null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          obj.forEach((plan) => {
            if (plan.name === 'alamo-influxdb:shared') {
              influxdb_plan = plan;
            }
          });
          expect(influxdb_plan).to.be.an('object');
          done();
        });
    });

    it('covers creating an influxdb instance and being able to add an addon to an app without a formation running', (done) => {
      expect(influxdb_plan).to.be.an('object');
      expect(influxdb_plan.id).to.be.a('string');
      httph.request(
        'post',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons`,
        alamo_headers,
        JSON.stringify({ plan: influxdb_plan.id }),
        (err, data) => {
          if (err) {
            console.log(err);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          influxdb_response = obj;
          done();
        },
      );
    });

    it('covers getting info on a running influxdb service', (done) => {
      expect(influxdb_response).to.be.an('object');
      expect(influxdb_plan).to.be.an('object');
      expect(influxdb_plan.id).to.be.a('string');
      httph.request(
        'get',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${influxdb_response.id}`,
        alamo_headers,
        null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          expect(obj.id).to.equal(influxdb_response.id);
          done();
        },
      );
    });

    it('covers removing a influxdb service', (done) => {
      expect(influxdb_response).to.be.an('object');
      expect(influxdb_plan).to.be.an('object');
      expect(influxdb_plan.id).to.be.a('string');
      httph.request(
        'delete',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${influxdb_response.id}`,
        alamo_headers,
        null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          expect(obj.id).to.equal(influxdb_response.id);
          done();
        },
      );
    });

    it('covers getting a cassandra plans', (done) => {
      httph.request('get', 'http://localhost:5000/addon-services/alamo-cassandra/plans', alamo_headers, null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          obj.forEach((plan) => {
            if (plan.name === 'alamo-cassandra:small') {
              cassandra_plan = plan;
            }
          });
          expect(cassandra_plan).to.be.an('object');
          done();
        });
    });

    it('covers creating an cassandra instance and being able to add an addon to an app without a formation running', (done) => {
      expect(cassandra_plan).to.be.an('object');
      expect(cassandra_plan.id).to.be.a('string');
      httph.request(
        'post',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons`,
        alamo_headers,
        JSON.stringify({ plan: cassandra_plan.id }),
        (err, data) => {
          if (err) {
            console.log(err);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          cassandra_response = obj;
          done();
        },
      );
    });

    it('covers getting info on a running cassandra service', (done) => {
      expect(cassandra_response).to.be.an('object');
      expect(cassandra_plan).to.be.an('object');
      expect(cassandra_plan.id).to.be.a('string');
      httph.request(
        'get',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${cassandra_response.id}`,
        alamo_headers,
        null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          expect(obj.id).to.equal(cassandra_response.id);
          done();
        },
      );
    });

    it('covers removing a cassandra service', (done) => {
      expect(cassandra_response).to.be.an('object');
      expect(cassandra_plan).to.be.an('object');
      expect(cassandra_plan.id).to.be.a('string');
      httph.request(
        'delete',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${cassandra_response.id}`,
        alamo_headers,
        null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          expect(obj.id).to.equal(cassandra_response.id);
          done();
        },
      );
    });

    it('covers getting a redis plans', (done) => {
      expect(postgres_plan).to.be.an('object');
      expect(postgres_plan.id).to.be.a('string');
      httph.request('get', 'http://localhost:5000/addon-services/alamo-redis/plans', alamo_headers, null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          obj.forEach((plan) => {
            if (plan.name === 'alamo-redis:small') {
              redis_plan = plan;
            }
          });
          expect(redis_plan).to.be.an('object');
          done();
        });
    });

    it('covers creating a redis service and being able to add an addon to an app with an existing formation', (done) => {
      expect(postgres_plan).to.be.an('object');
      expect(postgres_plan.id).to.be.a('string');
      expect(redis_plan).to.be.an('object');
      expect(redis_plan.id).to.be.a('string');
      httph.request(
        'post',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons`,
        alamo_headers,
        JSON.stringify({ plan: redis_plan.id }),
        (err, data) => {
          if (err) {
            console.log(err);
            console.log(err.message);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          redis_response = obj;
          done();
        },
      );
    });

    it('covers getting es plans', (done) => {
      httph.request('get', 'http://localhost:5000/addon-services/alamo-es/plans', alamo_headers, null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          obj.forEach((plan) => {
            if (plan.name === 'alamo-es:micro') {
              es_plan = plan;
            }
          });
          expect(es_plan).to.be.an('object');
          done();
        });
    });

    it('covers getting info on a running redis service', (done) => {
      expect(redis_response).to.be.an('object');
      expect(redis_plan).to.be.an('object');
      expect(redis_plan.id).to.be.a('string');
      httph.request(
        'get',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${redis_response.id}`,
        alamo_headers,
        null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          expect(obj.id).to.equal(redis_response.id);
          expect(obj.attached_to).to.be.an('array');
          expect(obj.attached_to[0].owner).to.be.an('boolean');
          expect(obj.attached_to[0].owner).to.equal(true);
          done();
        },
      );
    });

    it('covers listing all services and checking for redis', (done) => {
      expect(redis_response).to.be.an('object');
      expect(redis_plan).to.be.an('object');
      expect(redis_plan.id).to.be.a('string');
      httph.request('get', `http://localhost:5000/apps/${appname_brand_new}-default/addons`, alamo_headers, null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          let found_redis = false;
          obj.forEach((service) => {
            if (service.id === redis_response.id) {
              found_redis = true;
            }
          });
          expect(found_redis).to.equal(true);
          done();
        });
    });

    it('covers removing a redis service', (done) => {
      expect(redis_response).to.be.an('object');
      expect(redis_plan).to.be.an('object');
      expect(redis_plan.id).to.be.a('string');
      httph.request(
        'delete',
        `http://localhost:5000/apps/${appname_brand_new}-default/addons/${redis_response.id}`,
        alamo_headers,
        null,
        (err, data) => {
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('object');
          expect(obj.id).to.equal(redis_response.id);
          done();
        },
      );
    });
  }

  it('covers getting a postgres plans', (done) => {
    httph.request('get', 'http://localhost:5000/addon-services/akkeris-postgresql/plans', alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        obj.forEach((plan) => {
          if (plan.name === 'akkeris-postgresql:hobby') {
            postgres_plan = plan;
          }
        });
        expect(postgres_plan).to.be.an('object');
        done();
      });
  });

  it('covers creating a postgres instance and being able to add an addon to an app without a formation running', (done) => {
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request(
      'post',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons`,
      alamo_headers,
      JSON.stringify({ plan: postgres_plan.id }),
      (err, data) => {
        if (err) {
          console.log(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('object');
        postgres_response = obj;
        done();
      },
    );
  });

  it('covers getting info on a running postgres service', (done) => {
    expect(postgres_response).to.be.an('object');
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request(
      'get',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgres_response.id}`,
      alamo_headers,
      null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('object');
        expect(obj.id).to.equal(postgres_response.id);
        done();
      },
    );
  });

  it('covers global /addons/{addon_id} end point', async () => {
    const obj = JSON.parse(await httph.request(
      'get',
      `http://localhost:5000/addons/${postgres_response.id}`,
      alamo_headers,
      null,
    ));
    expect(obj.id).to.equal(postgres_response.id);
  });

  it('covers global /addons/{addon_id}/config end point', async () => {
    const obj = JSON.parse(await httph.request(
      'get',
      `http://localhost:5000/addons/${postgres_response.id}/config`,
      alamo_headers,
      null,
    ));
    expect(obj.DATABASE_URL).to.be.a('string');
  });

  it('covers global /addons end point', async () => {
    const obj = JSON.parse(await httph.request('get', 'http://localhost:5000/addons', alamo_headers, null));
    expect(obj).to.be.an('array');
  });

  it('covers listing all services and checking for postgres', (done) => {
    expect(postgres_response).to.be.an('object');
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request('get', `http://localhost:5000/apps/${appname_brand_new}-default/addons`, alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        let found_postgres = false;
        obj.forEach((service) => {
          if (service.id === postgres_response.id) {
            found_postgres = true;
          }
        });
        expect(found_postgres).to.equal(true);
        done();
      });
  });

  it('covers removing a postgres service', (done) => {
    expect(postgres_response).to.be.an('object');
    expect(postgres_plan).to.be.an('object');
    expect(postgres_plan.id).to.be.a('string');
    httph.request(
      'delete',
      `http://localhost:5000/apps/${appname_brand_new}-default/addons/${postgres_response.id}`,
      alamo_headers,
      null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('object');
        expect(obj.id).to.equal(postgres_response.id);
        done();
      },
    );
  });

  it('covers ensuring all services were deleted', (done) => {
    httph.request('get', `http://localhost:5000/apps/${appname_brand_new}-default/addons`, alamo_headers, null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const obj = JSON.parse(data);
        expect(obj).to.be.an('array');
        expect(obj.length).to.equal(0);
        done();
      });
  });

  it('covers deleting the test app for services', (done) => {
    httph.request('delete', `http://localhost:5000/apps/${appname_brand_new}-default`, alamo_headers, null, (err, data) => {
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      done();
    });
  });
});
