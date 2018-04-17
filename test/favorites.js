"use strict";

process.env.PORT = 5000;
process.env.DEFAULT_PORT = "5000";
process.env.TEST_MODE = "true"; // prevents creating actual spaces.  Since we cant delete them, we bail out before committing.
process.env.AUTH_KEY = 'hello';
const alamo_headers = {"Authorization": process.env.AUTH_KEY, "User-Agent": "Hello", "x-username":"test", "x-elevated-access":"true"};
const user_alamo_headers = {"Authorization": process.env.AUTH_KEY, "User-Agent": "Hello"};

const init = require('./support/init.js');
const httph = require('../lib/http_helper.js');
const expect = require("chai").expect;
const uuid = require('uuid');
const app_id = 'fa2b535d-de4d-4a14-be36-d44af53b59e3'; // default app populated in the DB


describe("favorites: ensure we can create, list and delete favorites", function () {
    this.timeout(10000);
    
    function headers(username) {
        let copy = JSON.parse(JSON.stringify(alamo_headers));
        copy['x-username'] = username;
        return copy;
    }

    it("covers listing favorites", (done) => {
        var u = 'test' + uuid.v4();
        httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:app_id}, (err, data) => {
            expect(err).to.be.null;
            httph.request('get', 'http://localhost:5000/favorites', headers(u), null, (err, data) => {
                expect(err).to.be.null;
                expect(data).to.be.a('string');
                let obj = JSON.parse(data);
                expect(obj).to.be.an('array');
                expect(obj.length).equals(1);
                expect(obj[0].app).equals(app_id);
                httph.request('delete', 'http://localhost:5000/favorites/' + app_id, headers(u), null, (err, data) => {
                    expect(err).to.be.null;
                    done();
                });
            });
        });
    });

    it("returns empty list of favories for a new user", (done) => {
        httph.request('get', 'http://localhost:5000/favorites', headers('test' + uuid.v4()), null, (err, data) => {
            expect(err).to.be.null;
            expect(data).to.be.a('string');
            let obj = JSON.parse(data);
            expect(obj).to.be.an('array');
            expect(obj.length).equals(0);
            done();
        });
    });

    it("GET /favorites returns 401 if x-username is not present in the header", (done) => {
        httph.request('get', 'http://localhost:5000/favorites', user_alamo_headers, null, (err, data) => {
            expect(err.code).equals(403);
            done();
        });
    });

    it("POST /favorites returns 401 if x-username is not present in the header", (done) => {
        httph.request('post', 'http://localhost:5000/favorites', user_alamo_headers, {app:app_id}, (err, data) => {
            expect(err.code).equals(403);
            done();
        });
    });

    it("POST /favorites returns 404 if app name is not valid", (done) => {
        var u = 'test' + uuid.v4();
        httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:uuid.v4()}, (err, data) => {
            expect(err.code).equals(404);
            done();
        });
    });

    it("DELETE /favorites returns 403 if x-username is not present in the header", (done) => {
        httph.request('delete', 'http://localhost:5000/favorites/' + app_id, user_alamo_headers, null, (err, data) => {
            expect(err.code).equals(403);
            done();
        });
    });

    it("DELETE /favorites returns 404 if app name is not valid", (done) => {
        var u = 'test' + uuid.v4();
        httph.request('delete', 'http://localhost:5000/favorites/' + uuid.v4(), headers(u), null, (err, data) => {
            expect(err.code).equals(404);
            done();
        });
    });

    it("POST /favorites handles the case when the user adds the same favorite app twice", (done) => {
        var u = 'test' + uuid.v4();
        httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:app_id}, (err, data) => {
            expect(err).to.be.null;
            httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:app_id}, (err, data) => {
                expect(err).to.be.null;
                httph.request('get', 'http://localhost:5000/favorites', headers(u), null, (err, data) => {
                    expect(err).to.be.null;
                    expect(data).to.be.a('string');
                    let obj = JSON.parse(data);
                    expect(obj).to.be.an('array');
                    expect(obj.length).equals(1);
                    expect(obj[0].app).equals(app_id);
                    httph.request('delete', 'http://localhost:5000/favorites/' + app_id, headers(u), null, (err, data) => {
                       expect(err).to.be.null;
                       done();
                    });
                });
            });
        });
    });

    it("POST and DELETE to /favorites allow to pass the app name", (done) => {
        var u = 'test' + uuid.v4();
        httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:"api-default"}, (err, data) => {
            expect(err).to.be.null;
            httph.request('get', 'http://localhost:5000/favorites', headers(u), null, (err, data) => {
                expect(err).to.be.null;
                expect(data).to.be.a('string');
                let obj = JSON.parse(data);
                expect(obj).to.be.an('array');
                expect(obj.length).equals(1);
                expect(obj[0].app).equals(app_id);
                httph.request('delete', 'http://localhost:5000/favorites/api-default', headers(u), null, (err, data) => {
                    expect(err).to.be.null;
                    done();
                });
            });
        });
    });

    it("POST /favorites can add the same app after removal", (done) => {
        var u = 'test' + uuid.v4();
        httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:app_id}, (err, data) => {
            expect(err).to.be.null;
            httph.request('delete', 'http://localhost:5000/favorites/' + app_id, headers(u), null, (err, data) => {
                expect(err).to.be.null;
                httph.request('post', 'http://localhost:5000/favorites', headers(u), {app:app_id}, (err, data) => {
                    expect(err).to.be.null;
                    expect(data).to.be.a('string');
                    let obj = JSON.parse(data);
                    expect(obj.app).equals(app_id);
                    httph.request('delete', 'http://localhost:5000/favorites/' + app_id, headers(u), null, (err, data) => {
                       expect(err).to.be.null;
                       done();
                    });
                });
            });
        });
    });

});