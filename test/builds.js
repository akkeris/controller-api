/* eslint-disable no-unused-expressions */
process.env.DEFAULT_PORT = '5000';
process.env.PORT = 5000;
process.env.AUTH_KEY = 'hello';
const alamo_headers = {
  Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
};

const { expect } = require('chai');

function wait_for_build(httph, app, build_id, callback, iteration) {
  iteration = iteration || 1;
  if (iteration === 1) {
    process.stdout.write('    ~ Waiting for build');
  }
  httph.request(
    'get',
    `http://localhost:5000/apps/${app}/builds/${build_id}`,
    alamo_headers,
    null,
    (err, data) => {
      if (err && err.code === 423) {
        process.stdout.write('.');
        setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
      } else if (err) {
        callback(err, null);
      } else {
        const build_info = JSON.parse(data);
        if (build_info.status === 'pending' || build_info.status === 'queued') {
          process.stdout.write('.');
          setTimeout(wait_for_build.bind(null, httph, app, build_id, callback, (iteration + 1)), 500);
        } else {
          process.stdout.write('\n');
          callback(null, data);
        }
      }
    },
  );
}

function validate_build_obj(build_obj) {
  expect(build_obj.id).to.be.a('string');
  expect(build_obj.app).to.be.an('object');
  expect(build_obj.created_at).to.be.a('string');
  expect(build_obj.updated_at).to.be.a('string');
  expect(build_obj.source_blob).to.be.an('object');
  expect(build_obj.source_blob.checksum).to.be.a('string');
  expect(build_obj.source_blob.url).to.be.a('string');
  expect(build_obj.source_blob.version).to.be.a('string');
  expect(build_obj.source_blob.commit).to.be.a('string');
  expect(build_obj.slug).to.be.an('object');
  expect(build_obj.slug.id).to.be.a('string');
  expect(build_obj.status).to.be.a('string');
  expect(build_obj.user).to.be.an('object');
  expect(build_obj.user.id).to.be.a('string');
  expect(build_obj.user.email).to.be.a('string');
}


describe('builds: conversion between payload, response and database', function () {
  const support = require('./support/init.js');

  this.timeout(300000);

  // let builds = require('../lib/builds.js')
  const httph = require('../lib/http_helper.js');
  let build_id_after_test = null;

  it('covers ensuring soft error on non-uuid', function (done) {
    this.timeout(0);
    httph.request(
      'get',
      'http://localhost:5000/apps/api-default/builds/this-is-not-a-uuid',
      alamo_headers,
      null,
      (err, build_info) => {
        expect(err).to.be.an('object');
        expect(err.code).to.equal(422);
        expect(build_info).to.be.null;
        done();
      },
    );
  });

  const appname_brand_new = `alamotest${Math.floor(Math.random() * 10000)}`;
  it('covers creating a build and rebuilding it', function (done) {
    this.timeout(0);
    // create an app.
    httph.request('post', 'http://localhost:5000/apps', alamo_headers,
      JSON.stringify({ org: 'test', space: 'default', name: appname_brand_new }),
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const build_payload = {
          sha: '123456',
          org: 'ocatnner',
          repo: 'https://github.com/abcd/some-repo',
          branch: 'master',
          version: 'v1.0',
          checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
          url: 'data:base64,UEsDBBQAAAAIAMRy+0gi9l2EawAAAIUAAAAKABwARG9ja2VyZmlsZVVUCQAD7xeZV+8XmVd1eAsAAQSKPdBdBEafakZzC/L3VcjLT0m1SixKz8/jCgr1U8jNTsksUtAtUNAvLS7SLy5K1k8sKOAK9w/ydvEMQhV09g+IVNBDFQMZkVeQq5CZV1ySmJPD5RoR4B/sqmBqYGDA5ezrohCtoASUVtJRUALKF5UoKcQCAFBLAwQUAAAACAAAc/tILLDUr7IAAAAHAQAACAAcAGluZGV4LmpzVVQJAANgGJlXYhiZV3V4CwABBIo90F0ERp9qRlVPvQrCQAze+xTB5VIo9So6SR0EoaNoxy7lGmix3Gku6lB8d+8qiA6BfH/5iHHWC/QiVyiB6XYfmFBFrNJtkphZ9sQP4mCIfG6YWqHzzCGGTBaCPoVyB1MCcc+fPAhV1Ha40jqD6RVu/Si46Gkc3eLLku0wgGj7dOXOojLjQFYOzI5VBkjMGXhnLiTfsg+c86qq6+OyyAtYaw37toNTeIe8NNzYOOq/YRy8kMWN1jrdvgFQSwMEFAAAAAgA6nv7SEmwHUOYAAAA6QAAAAwAHABwYWNrYWdlLmpzb25VVAkAAycomVcpKJlXdXgLAAEEij3QXQRGn2pGVY+7DoMwDEV3vsLywFQhWFmrDp27skSJK1yVhMYBIRD/3iQgVR19zvVrKwDQqoGwBfxMvK4keElwJi/sbOJNVVf1QQ2J9jyG0xxwUJwrtoaW6nUOOIISxRbLBILyIeWsMwR/4WgDSZakewcd3rx3vgXrIAmQkTQ/mUyHUJZACwdoMHbueZeaQu/876I3a7KSn7o/rljsxRdQSwECHgMUAAAACADEcvtIIvZdhGsAAACFAAAACgAYAAAAAAABAAAApIEAAAAARG9ja2VyZmlsZVVUBQAD7xeZV3V4CwABBIo90F0ERp9qRlBLAQIeAxQAAAAIAABz+0gssNSvsgAAAAcBAAAIABgAAAAAAAEAAACkga8AAABpbmRleC5qc1VUBQADYBiZV3V4CwABBIo90F0ERp9qRlBLAQIeAxQAAAAIAOp7+0hJsB1DmAAAAOkAAAAMABgAAAAAAAEAAACkgaMBAABwYWNrYWdlLmpzb25VVAUAAycomVd1eAsAAQSKPdBdBEafakZQSwUGAAAAAAMAAwDwAAAAgQIAAAAA',
        };
        httph.request(
          'post',
          `http://localhost:5000/apps/${appname_brand_new}-default/builds`,
          alamo_headers,
          JSON.stringify(build_payload),
          (error, build_info) => {
            if (error) {
              console.error(error);
            }
            expect(error).to.be.null;
            expect(build_info).to.be.a('string');
            const build_obj = JSON.parse(build_info);
            validate_build_obj(build_obj);
            build_id_after_test = build_obj.id;
          wait_for_build(httph, `${appname_brand_new}-default`, build_obj.id, (wait_err, building_info) => { // eslint-disable-line
              if (wait_err) {
                console.error('Error waiting for build:', wait_err);
                return expect(true).to.equal(false);
              }
              validate_build_obj(JSON.parse(building_info));
              httph.request(
                'get',
                `http://localhost:5000/apps/${appname_brand_new}-default/builds/${build_obj.id}/result`,
                alamo_headers,
                null,
                (error2, build_result) => {
                  expect(error2).to.be.null;
                  expect(build_result).to.be.a('string');
                  const build_res = JSON.parse(build_result);
                  expect(build_res.build).to.be.an('object');
                  expect(build_res.lines).to.be.an('array');

                  httph.request(
                    'put',
                    `http://localhost:5000/apps/${appname_brand_new}-default/builds/${build_obj.id}`,
                    alamo_headers,
                    null,
                    (error3, build_info_new) => {
                      if (error3) {
                        console.error(error3);
                      }
                      expect(error3).to.be.null;
                      expect(build_info_new).to.be.a('string');
                      build_info_new = JSON.parse(build_info_new);
                      expect(build_info_new.id).to.be.a('string');
                      expect(build_obj.id).to.not.equal(build_info_new.id);
                      validate_build_obj(build_info_new);

                      wait_for_build(
                        httph,
                        `${appname_brand_new}-default`,
                        build_info_new.id,
                        (wait_err2 /* building_info_new */) => { // eslint-disable-line consistent-return
                          if (wait_err2) {
                            console.error('Error waiting for re-build:', wait_err2);
                            return expect(true).to.equal(false);
                          }
                          done();
                        },
                      );
                    },
                  );
                },
              );
            });
          },
        );
      });
  });

  it('covers audit events for a build', (done) => {
    setTimeout(() => {
      httph.request('get', `http://localhost:5000/audits?app=${appname_brand_new}&space=default`, alamo_headers, null,
        (err, data) => {
          if (err) {
            console.error(err);
          }
          expect(err).to.be.null;
          expect(data).to.be.a('string');
          const obj = JSON.parse(data);
          expect(obj).to.be.an('array');
          expect(obj.some((x) => x.action === 'build')).to.eql(true);
          done();
        });
    }, 5000);
  });

  it('covers creating a build needing escaped characters', async function () {
    this.timeout(0);
    const odd_payload = '{  "type": "service_account",  "project_id": "abcd-1113333",  "private_key_id": "abcd",  "private_key": "\t-----BEGIN NOT A PRIVATE KEY-----\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\nabcd\n-----END NOT A PRIVATE KEY-----\n",  "client_email": "abcd@abcd-111333.abcd.abcd.com",  "client_id": "1234556677",  "auth_uri": "https://aaa.abcd.com/o/oauth2/auth",  "token_uri": "https://aaa.abcd.com/o/oauth2/token",  "auth_provider_x509_cert_url":"https://www.abcdef.com/oauth2/v1/certs",  "client_x509_cert_url": "https://www.abcdef.com/robot/v1/metadata/x509/abcd%40abcde-111111.111.111abcd.com"}';
    await httph.request(
      'patch',
      `http://localhost:5000/apps/${appname_brand_new}-default/config-vars`,
      alamo_headers,
      JSON.stringify({ FOO: odd_payload }),
    );
    const build_payload = {
      sha: '123456',
      org: 'ocatnner',
      repo: 'https://github.com/abcd/some-repo',
      branch: 'master',
      version: 'v1.0',
      checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      url: 'data:base64,UEsDBAoAAAAAAPammUoAAAAAAAAAAAAAAAAIABwAc29tZWRpci9VVAkAAzAMAFlnDABZdXgLAAEEij3QXQQUAAAAUEsDBBQAAAAIAMaqTUrtS54nawAAAIUAAAASABwAc29tZWRpci9Eb2NrZXJmaWxlVVQJAAP0haJYMQwAWXV4CwABBIo90F0EFAAAAHML8vdVyMtPSbVKLErPz+MKCvVTyM1OySxS0C1Q0C8tLtIvLkrWTywo4Ar3D/J28QxCFXT2D4hU0EMVAxmRV5CrkJlXXJKYk8PlGhHgH+yqYGlgYMDl7OuiEK2gBJRW0lFQAsoXlSgpxAIAUEsDBBQAAAAIAMaqTUroz2k/cQEAAIUCAAAQABwAc29tZWRpci9pbmRleC5qc1VUCQAD9IWiWDEMAFl1eAsAAQSKPdBdBBQAAAB1UU1LAzEQve+vGPayWbrGrXgThQqFKtpKW71YkWV3WkNjopPZqmj/u5O2+AUGApnJzHtv3qRtQAhMpuY0SWrvAsMD8xMcA+FzawhVFuMsP0qeyNcYgka30uP+9Ho8vL/pXVz3pfbfr48PSAMyG7cQQG7JwaqyLcK8MhYbne44A9IKSZAima4JK8bJJqeUCCmkOeRwfALvCcS3fiHDOMCqUQdlWcD7WgQCmHms1i1ZbVyDr6O5ykSTIe8e0XGWwwnsdfMNyg8cdT4ZDXW0wS3M/E39GCff4K4BrRj1t+2/sbc9O6XoGiWJKHA7pfZOZbU1IqhP5CkrQCFRAcHXS+SvMbfhpj8bTKdX+13dhcOyhNOqgbFsBwPPaObizXYMiUUGIz6WkY3PHAtlZZX6QjWdTlQXbfcWtfULlb54Wor7LIBwm0Ln1z4Ho8l02LvsSzq9gyW+wd+KXxuXKjA7WkgLMFFZAd1SzrcF1gRGF3cnyU9QSwMEFAAAAAgAxqpNSkmwHUOYAAAA6QAAABQAHABzb21lZGlyL3BhY2thZ2UuanNvblVUCQAD9IWiWDEMAFl1eAsAAQSKPdBdBBQAAABVj7sOgzAMRXe+wvLAVCFYWasOnbuyRIkrXJWExgEhEP/eJCBVHX3O9WsrANCqgbAF/Ey8riR4SXAmL+xs4k1VV/VBDYn2PIbTHHBQnCu2hpbqdQ44ghLFFssEgvIh5awzBH/haANJlqR7Bx3evHe+BesgCZCRND+ZTIdQlkALB2gwdu55l5pC7/zvojdrspKfuj+uWOzFF1BLAQIeAwoAAAAAAPammUoAAAAAAAAAAAAAAAAIABgAAAAAAAAAEADtQQAAAABzb21lZGlyL1VUBQADMAwAWXV4CwABBIo90F0EFAAAAFBLAQIeAxQAAAAIAMaqTUrtS54nawAAAIUAAAASABgAAAAAAAEAAACkgUIAAABzb21lZGlyL0RvY2tlcmZpbGVVVAUAA/SFolh1eAsAAQSKPdBdBBQAAABQSwECHgMUAAAACADGqk1K6M9pP3EBAACFAgAAEAAYAAAAAAABAAAApIH5AAAAc29tZWRpci9pbmRleC5qc1VUBQAD9IWiWHV4CwABBIo90F0EFAAAAFBLAQIeAxQAAAAIAMaqTUpJsB1DmAAAAOkAAAAUABgAAAAAAAEAAACkgbQCAABzb21lZGlyL3BhY2thZ2UuanNvblVUBQAD9IWiWHV4CwABBIo90F0EFAAAAFBLBQYAAAAABAAEAFYBAACaAwAAAAA=',
    };
    const build_info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_brand_new}-default/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    );
    expect(build_info).to.be.a('string');
    const build_obj = JSON.parse(build_info);
    expect(build_obj.id).to.be.a('string');
    const building_info = await support.wait_for_build(`${appname_brand_new}-default`, build_obj.id);
    expect(building_info.status).to.equal('succeeded');
  });

  let build_id = null;
  it('covers creating a build with no hidden files', async function () {
    this.timeout(0);
    const build_payload = {
      sha: '123456',
      org: 'ocatnner',
      repo: 'https://github.com/abcd/some-repo',
      branch: 'master',
      version: 'v1.0',
      checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
      url: 'data:base64,UEsDBAoAAAAAAPammUoAAAAAAAAAAAAAAAAIABwAc29tZWRpci9VVAkAAzAMAFlnDABZdXgLAAEEij3QXQQUAAAAUEsDBBQAAAAIAMaqTUrtS54nawAAAIUAAAASABwAc29tZWRpci9Eb2NrZXJmaWxlVVQJAAP0haJYMQwAWXV4CwABBIo90F0EFAAAAHML8vdVyMtPSbVKLErPz+MKCvVTyM1OySxS0C1Q0C8tLtIvLkrWTywo4Ar3D/J28QxCFXT2D4hU0EMVAxmRV5CrkJlXXJKYk8PlGhHgH+yqYGlgYMDl7OuiEK2gBJRW0lFQAsoXlSgpxAIAUEsDBBQAAAAIAMaqTUroz2k/cQEAAIUCAAAQABwAc29tZWRpci9pbmRleC5qc1VUCQAD9IWiWDEMAFl1eAsAAQSKPdBdBBQAAAB1UU1LAzEQve+vGPayWbrGrXgThQqFKtpKW71YkWV3WkNjopPZqmj/u5O2+AUGApnJzHtv3qRtQAhMpuY0SWrvAsMD8xMcA+FzawhVFuMsP0qeyNcYgka30uP+9Ho8vL/pXVz3pfbfr48PSAMyG7cQQG7JwaqyLcK8MhYbne44A9IKSZAima4JK8bJJqeUCCmkOeRwfALvCcS3fiHDOMCqUQdlWcD7WgQCmHms1i1ZbVyDr6O5ykSTIe8e0XGWwwnsdfMNyg8cdT4ZDXW0wS3M/E39GCff4K4BrRj1t+2/sbc9O6XoGiWJKHA7pfZOZbU1IqhP5CkrQCFRAcHXS+SvMbfhpj8bTKdX+13dhcOyhNOqgbFsBwPPaObizXYMiUUGIz6WkY3PHAtlZZX6QjWdTlQXbfcWtfULlb54Wor7LIBwm0Ln1z4Ho8l02LvsSzq9gyW+wd+KXxuXKjA7WkgLMFFZAd1SzrcF1gRGF3cnyU9QSwMEFAAAAAgAxqpNSkmwHUOYAAAA6QAAABQAHABzb21lZGlyL3BhY2thZ2UuanNvblVUCQAD9IWiWDEMAFl1eAsAAQSKPdBdBBQAAABVj7sOgzAMRXe+wvLAVCFYWasOnbuyRIkrXJWExgEhEP/eJCBVHX3O9WsrANCqgbAF/Ey8riR4SXAmL+xs4k1VV/VBDYn2PIbTHHBQnCu2hpbqdQ44ghLFFssEgvIh5awzBH/haANJlqR7Bx3evHe+BesgCZCRND+ZTIdQlkALB2gwdu55l5pC7/zvojdrspKfuj+uWOzFF1BLAQIeAwoAAAAAAPammUoAAAAAAAAAAAAAAAAIABgAAAAAAAAAEADtQQAAAABzb21lZGlyL1VUBQADMAwAWXV4CwABBIo90F0EFAAAAFBLAQIeAxQAAAAIAMaqTUrtS54nawAAAIUAAAASABgAAAAAAAEAAACkgUIAAABzb21lZGlyL0RvY2tlcmZpbGVVVAUAA/SFolh1eAsAAQSKPdBdBBQAAABQSwECHgMUAAAACADGqk1K6M9pP3EBAACFAgAAEAAYAAAAAAABAAAApIH5AAAAc29tZWRpci9pbmRleC5qc1VUBQAD9IWiWHV4CwABBIo90F0EFAAAAFBLAQIeAxQAAAAIAMaqTUpJsB1DmAAAAOkAAAAUABgAAAAAAAEAAACkgbQCAABzb21lZGlyL3BhY2thZ2UuanNvblVUBQAD9IWiWHV4CwABBIo90F0EFAAAAFBLBQYAAAAABAAEAFYBAACaAwAAAAA=',
    };
    const build_info = await httph.request(
      'post',
      `http://localhost:5000/apps/${appname_brand_new}-default/builds`,
      alamo_headers,
      JSON.stringify(build_payload),
    );
    expect(build_info).to.be.a('string');
    const build_obj = JSON.parse(build_info);
    expect(build_obj.id).to.be.a('string');
    const building_info = await support.wait_for_build(`${appname_brand_new}-default`, build_obj.id);
    expect(building_info.status).to.equal('succeeded');
    build_id = build_obj.id;
  });

  it('covers querying the slug endpoint', async () => {
    expect(build_id).to.be.a('string');
    const slug_info = JSON.parse(await httph.request(
      'get',
      `http://localhost:5000/slugs/${build_id}`,
      alamo_headers,
      null,
    ));
    expect(slug_info).to.be.an('object');
    expect(slug_info.slug).to.be.an('object');
    expect(slug_info.slug.id).to.be.a('string');
    validate_build_obj(slug_info);
  });

  it('covers removing build app', (done) => {
    // destroy the app.
    httph.request(
      'delete',
      `http://localhost:5000/apps/${appname_brand_new}-default`,
      alamo_headers,
      null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
      },
    );
  });

  const random_name = `alamotest${Math.floor(Math.random() * 10000)}`;
  it('covers stopping a build', function (done) {
    this.timeout(0);
    // create an app.
    httph.request(
      'post',
      'http://localhost:5000/apps',
      alamo_headers,
      JSON.stringify({ org: 'test', space: 'default', name: random_name }),
      (err, data) => {
        if (err) {
          console.error(err);
        }
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        const build_payload = {
          sha: '123456',
          org: 'ocatnner',
          repo: 'https://github.com/abcd/some-repo',
          branch: 'master',
          version: 'v1.0',
          checksum: 'sha256:d3e015c1ef2d5d6d8eafe4451ea148dd3d240a6826d927bcc9c741b66fb46756',
          url: 'data:base64,UEsDBBQAAAAIAMRy+0gi9l2EawAAAIUAAAAKABwARG9ja2VyZmlsZVVUCQAD7xeZV+8XmVd1eAsAAQSKPdBdBEafakZzC/L3VcjLT0m1SixKz8/jCgr1U8jNTsksUtAtUNAvLS7SLy5K1k8sKOAK9w/ydvEMQhV09g+IVNBDFQMZkVeQq5CZV1ySmJPD5RoR4B/sqmBqYGDA5ezrohCtoASUVtJRUALKF5UoKcQCAFBLAwQUAAAACAAAc/tILLDUr7IAAAAHAQAACAAcAGluZGV4LmpzVVQJAANgGJlXYhiZV3V4CwABBIo90F0ERp9qRlVPvQrCQAze+xTB5VIo9So6SR0EoaNoxy7lGmix3Gku6lB8d+8qiA6BfH/5iHHWC/QiVyiB6XYfmFBFrNJtkphZ9sQP4mCIfG6YWqHzzCGGTBaCPoVyB1MCcc+fPAhV1Ha40jqD6RVu/Si46Gkc3eLLku0wgGj7dOXOojLjQFYOzI5VBkjMGXhnLiTfsg+c86qq6+OyyAtYaw37toNTeIe8NNzYOOq/YRy8kMWN1jrdvgFQSwMEFAAAAAgA6nv7SEmwHUOYAAAA6QAAAAwAHABwYWNrYWdlLmpzb25VVAkAAycomVcpKJlXdXgLAAEEij3QXQRGn2pGVY+7DoMwDEV3vsLywFQhWFmrDp27skSJK1yVhMYBIRD/3iQgVR19zvVrKwDQqoGwBfxMvK4keElwJi/sbOJNVVf1QQ2J9jyG0xxwUJwrtoaW6nUOOIISxRbLBILyIeWsMwR/4WgDSZakewcd3rx3vgXrIAmQkTQ/mUyHUJZACwdoMHbueZeaQu/876I3a7KSn7o/rljsxRdQSwECHgMUAAAACADEcvtIIvZdhGsAAACFAAAACgAYAAAAAAABAAAApIEAAAAARG9ja2VyZmlsZVVUBQAD7xeZV3V4CwABBIo90F0ERp9qRlBLAQIeAxQAAAAIAABz+0gssNSvsgAAAAcBAAAIABgAAAAAAAEAAACkga8AAABpbmRleC5qc1VUBQADYBiZV3V4CwABBIo90F0ERp9qRlBLAQIeAxQAAAAIAOp7+0hJsB1DmAAAAOkAAAAMABgAAAAAAAEAAACkgaMBAABwYWNrYWdlLmpzb25VVAUAAycomVd1eAsAAQSKPdBdBEafakZQSwUGAAAAAAMAAwDwAAAAgQIAAAAA',
        };
        httph.request(
          'post',
          `http://localhost:5000/apps/${random_name}-default/builds`,
          alamo_headers,
          JSON.stringify(build_payload),
          (err2, build_info) => {
            expect(err2).to.be.null;
            expect(build_info).to.be.a('string');
            const build_obj = JSON.parse(build_info);
            expect(build_obj.id).to.be.a('string');

            // Give it a second to wait for the build to go from queued to running..
            setTimeout(() => {
              httph.request(
                'delete',
                `http://localhost:5000/apps/${random_name}-default/builds/${build_obj.id}`,
                alamo_headers,
                null,
                (err3, build_stop_info) => {
                  if (err3) {
                    console.error('Error trying to stop build:', err3);
                  }
                  expect(err3).to.be.null;
                  expect(build_stop_info).to.be.a('string');
                  build_stop_info = JSON.parse(build_stop_info);
                  expect(build_stop_info.status).to.equal('failed');
                  expect(build_stop_info.id).to.equal(build_obj.id);
                  setTimeout(() => {
                    done();
                  }, 1000);
                },
              );
            }, 2000);
          },
        );
      },
    );
  });

  it('covers getting build info', (done) => {
    httph.request('get', `http://localhost:5000/apps/${random_name}-default/builds`, alamo_headers, null,
      (err, data) => {
        const objs = JSON.parse(data);
        expect(err).to.be.null;
        expect(objs).to.be.an('array');
        objs.map(validate_build_obj);
        httph.request('get', `http://localhost:5000/apps/${random_name}-default/builds/${objs[0].id}`, alamo_headers, null,
          (err2, build_info) => {
            const obj = JSON.parse(build_info);
            expect(err2).to.be.null;
            expect(obj).to.be.an('object');
            validate_build_obj(obj);
            done();
          });
      });
  });

  it('covers removing test app for builds', (done) => {
    // destroy the app.
    httph.request(
      'delete',
      `http://localhost:5000/apps/${random_name}-default`,
      alamo_headers,
      null,
      (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        done();
      },
    );
  });

  it('ensures we can still fetch the build as a slug after the app was deleted', async () => {
    validate_build_obj(JSON.parse(await httph.request('get',
      `http://localhost:5000/slugs/${build_id_after_test}`,
      alamo_headers,
      null)));
  });
});
