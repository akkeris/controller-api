/* eslint-disable no-unused-expressions */
describe('apps: ensure we can create an app, list apps, view app info and delete apps', function () {
  const init = require('./support/init.js'); // eslint-disable-line
  
  this.timeout(10 * 60 * 1000);
  process.env.PORT = 5000;
  process.env.AUTH_KEY = 'hello';
  process.env.DEFAULT_PORT = '5000';

  const httph = require('../lib/http_helper.js');
  const { expect } = require('chai');
  // const apps = require('../lib/apps.js');
  const alamo_headers = { Authorization: process.env.AUTH_KEY, 'x-username': 'test', 'x-elevated-access': 'true' };

  it('Ensures apps that dont exist, return 404.', (done) => {
    httph.request('get', 'http://localhost:5000/apps/idonotexist-default', alamo_headers, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      expect(err.code).to.equal(404);
      done();
    });
  });
  it('Ensures organization is required.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({
        name: 'testing123', space: 'testing123', size: 'gp2', quantity: 1, type: 'web', port: 9000,
      }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The application org field was not specified');
        done();
      });
  });
  it('Ensures app name is required.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({
        org: 'testing123', space: 'testing123', size: 'gp2', quantity: 1, type: 'web', port: 9000,
      }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The application name was invalid or missing, it cannot contain dashes or other special characters.');
        done();
      });
  });
  it('Ensures space name is required.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({
        org: 'testing123', name: 'testing123', size: 'gp2', quantity: 1, type: 'web', port: 9000,
      }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The application space field was not specified');
        done();
      });
  });
  it('Ensures apps cannot have names above 24 characters.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({ org: 'testing123', space: 'testing123-1234', name: 'testing123' }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The application name was too long, the app space and name must be less than 24 characters.');
        done();
      });
  });
  it('Ensures apps cannot be created with duplicate names.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({
        org: 'test', space: 'default', name: 'api', size: 'gp2',
      }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(409);
        expect(err.message).to.equal('The requested application already exists.');
        done();
      });
  });
  it('Ensures apps cannot be created with brackets in names.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({
        org: 'test', space: 'default', name: '[fugazi]', size: 'gp2',
      }),
      (err, data) => {
        expect(err).to.be.an('object');
        expect(data).to.be.null;
        expect(err.code).to.equal(422);
        expect(err.message).to.equal('The application name was invalid or missing, it cannot contain dashes or other special characters.');
        done();
      });
  });
  // todo: correct app names (no dashes, alpha numeric only)
  it('Ensures we can create an app.', (done) => {
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({
        org: 'test',
        space: 'default',
        name: 'alamotestapp',
        size: 'gp2',
        quantity: 1,
        type: 'web',
        port: 9000,
        description: 'description',
        labels: 'label1,label2',
      }),
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        const appobj = JSON.parse(data);
        expect(appobj).to.be.an('object');
        expect(appobj.archived_at).to.be.a('string');
        expect(appobj.buildpack_provided_description).to.be.a('string');
        expect(appobj.build_stack).to.be.an('object');
        expect(appobj.build_stack.id).to.be.a('string');
        expect(appobj.build_stack.name).to.be.a('string');
        expect(appobj.created_at).to.be.a('string');
        expect(appobj.id).to.be.a('string');
        expect(appobj.maintenance).to.equal(false);
        expect(appobj.name).to.equal('alamotestapp-default');
        expect(appobj.simple_name).to.equal('alamotestapp');
        expect(appobj.key).to.equal('alamotestapp-default');
        expect(appobj.owner).to.be.an('object');
        expect(appobj.organization).to.be.an('object');
        expect(appobj.organization.name).to.equal('test');
        expect(appobj.region).to.be.an('object');
        expect(appobj.region.name).to.be.a('string');
        expect(appobj.released_at).to.be.null;
        expect(appobj.repo_size).to.equal(0);
        expect(appobj.slug_size).to.equal(0);
        expect(appobj.space).to.be.an('object');
        expect(appobj.space.name).to.equal('default');
        expect(appobj.stack).to.be.an('object');
        expect(appobj.updated_at).to.be.a('string');
        expect(appobj.web_url).to.contain(`https://alamotestapp${process.env.ALAMO_BASE_DOMAIN}`);
        expect(appobj.description).to.equal('description');
        expect(appobj.labels).to.equal('label1,label2');
        done();
      });
  });
  it('Ensures we can pull application info.', (done) => {
    httph.request('get', 'http://localhost:5000/apps/alamotestapp-default', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      const appobj = JSON.parse(data);
      expect(appobj).to.be.an('object');
      expect(appobj.archived_at).to.be.a('string');
      expect(appobj.buildpack_provided_description).to.be.a('string');
      expect(appobj.build_stack).to.be.an('object');
      expect(appobj.build_stack.id).to.be.a('string');
      expect(appobj.build_stack.name).to.be.a('string');
      expect(appobj.created_at).to.be.a('string');
      expect(appobj.id).to.be.a('string');
      expect(appobj.maintenance).to.equal(false);
      expect(appobj.name).to.equal('alamotestapp-default');
      expect(appobj.simple_name).to.equal('alamotestapp');
      expect(appobj.key).to.equal('alamotestapp-default');
      expect(appobj.owner).to.be.an('object');
      expect(appobj.organization).to.be.an('object');
      expect(appobj.organization.name).to.equal('test');
      expect(appobj.region).to.be.an('object');
      expect(appobj.region.name).to.be.a('string');
      expect(appobj.released_at).to.be.null;
      expect(appobj.image).to.be.a('string');
      expect(appobj.repo_size).to.equal(0);
      expect(appobj.slug_size).to.equal(0);
      expect(appobj.space).to.be.an('object');
      expect(appobj.space.name).to.equal('default');
      expect(appobj.stack).to.be.an('object');
      expect(appobj.updated_at).to.be.a('string');
      expect(appobj.web_url).to.contain(`https://alamotestapp${process.env.ALAMO_BASE_DOMAIN}`);
      expect(appobj.description).to.equal('description');
      expect(appobj.labels).to.equal('label1,label2');
      done();
    });
  });

  it('Ensure we can update app labels and description', (done) => {
    httph.request('patch', 'http://localhost:5000/apps/alamotestapp-default', alamo_headers,
      JSON.stringify({
        description: 'new description',
        labels: 'label3,label4',
      }),
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const appobj = JSON.parse(data);
        expect(appobj.description).to.equal('new description');
        expect(appobj.labels).to.equal('label3,label4');
        done();
      });
  });

  it('Ensures we can pull application info with relevant autobuild info.', (done) => {
    httph.request('get', 'http://localhost:5000/apps/api-default', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      const appobj = JSON.parse(data);
      expect(appobj).to.be.an('object');
      expect(appobj.name).to.equal('api-default');
      expect(appobj.git_url).to.be.a('string');
      done();
    });
  });
  it('Ensures we can pull all applications.', (done) => {
    httph.request('get', 'http://localhost:5000/apps', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      const appsobj = JSON.parse(data);
      expect(appsobj).to.be.an('array');
      appsobj.forEach((appobj) => {
        if (appobj.name === 'alamotestapp-default') {
          expect(appobj).to.be.an('object');
          expect(appobj.archived_at).to.be.a('string');
          expect(appobj.buildpack_provided_description).to.be.a('string');
          expect(appobj.build_stack).to.be.an('object');
          expect(appobj.build_stack.id).to.be.a('string');
          expect(appobj.build_stack.name).to.be.a('string');
          expect(appobj.created_at).to.be.a('string');
          expect(appobj.id).to.be.a('string');
          expect(appobj.maintenance).to.equal(false);
          expect(appobj.name).to.equal('alamotestapp-default');
          expect(appobj.key).to.equal('alamotestapp-default');
          expect(appobj.owner).to.be.an('object');
          expect(appobj.organization).to.be.an('object');
          expect(appobj.organization.name).to.equal('test');
          expect(appobj.region).to.be.an('object');
          expect(appobj.region.name).to.be.a('string');
          expect(appobj.released_at).to.be.null;
          expect(appobj.repo_size).to.equal(0);
          expect(appobj.slug_size).to.equal(0);
          expect(appobj.space).to.be.an('object');
          expect(appobj.space.name).to.equal('default');
          expect(appobj.stack).to.be.an('object');
          expect(appobj.updated_at).to.be.a('string');
          expect(appobj.web_url).to.contain(`https://alamotestapp${process.env.ALAMO_BASE_DOMAIN}`);
          done();
        }
      });
    });
  });

  it('Ensures we can pull all applications in simple mode.', (done) => {
    httph.request('get', 'http://localhost:5000/apps?simple=true', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      const appsobj = JSON.parse(data);
      expect(appsobj).to.be.an('array');
      appsobj.forEach((appobj) => {
        if (appobj.name === 'alamotestapp-default') {
          expect(appobj).to.be.an('object');
          expect(appobj.archived_at).to.be.undefined;
          expect(appobj.buildpack_provided_description).to.be.undefined;
          expect(appobj.build_stack).to.be.undefined;
          expect(appobj.created_at).to.be.a('string');
          expect(appobj.id).to.be.a('string');
          expect(appobj.maintenance).to.equal(false);
          expect(appobj.name).to.equal('alamotestapp-default');
          expect(appobj.key).to.equal('alamotestapp-default');
          expect(appobj.owner).to.be.undefined;
          expect(appobj.organization).to.be.an('object');
          expect(appobj.organization.name).to.equal('test');
          expect(appobj.region).to.be.an('object');
          expect(appobj.region.name).to.be.a('string');
          expect(appobj.released_at).to.be.undefined;
          expect(appobj.repo_size).to.be.undefined;
          expect(appobj.slug_size).to.be.undefined;
          expect(appobj.space).to.be.an('object');
          expect(appobj.space.name).to.equal('default');
          expect(appobj.stack).to.be.undefined;
          expect(appobj.updated_at).to.be.a('string');
          expect(appobj.web_url).to.contain(`https://alamotestapp${process.env.ALAMO_BASE_DOMAIN}`);
          done();
        }
      });
    });
  });

  it('Ensures we cannot delete an app in a socs/prod space.', (done) => {
    const new_headers = JSON.parse(JSON.stringify(alamo_headers));
    delete new_headers['x-elevated-access'];
    httph.request('delete', 'http://localhost:5000/apps/alamotestapp-default', new_headers, null, (err, data) => {
      expect(err).to.be.an('object');
      expect(data).to.be.null;
      expect(err.message).to.equal('This application can only be deleted by administrators.');
      done();
    });
  });
  it('Ensures we can delete an app.', (done) => {
    httph.request('delete', 'http://localhost:5000/apps/alamotestapp-default', alamo_headers, null, (err, data) => {
      if (err) {
        console.error(err);
      }
      expect(err).to.be.null;
      expect(data).to.be.a('string');
      const appdelobj = JSON.parse(data);
      expect(appdelobj.id).to.be.a('string');
      expect(appdelobj.name).to.equal('alamotestapp-default');
      expect(appdelobj.org).to.equal('test');
      expect(appdelobj.result).to.equal('successful');
      done();
    });
  });

  it('covers audit events for deleting an app', (done) => {
    setTimeout(() => {
      httph.request('get', 'http://localhost:5000/audits?app=alamotestapp&space=default', alamo_headers, null,
        (err, data) => {
          if (err) {
            console.error(err);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          expect(obj.some((x) => x.action === 'destroy')).to.eql(true);
          done();
        });
    }, 1000);
  });
});
