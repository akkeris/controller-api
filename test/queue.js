"use strict"

describe("queue: ensure queue works.", function() {
  let queue = require('../lib/queue');
  let expect = require("chai").expect;

  it("Ensures queue propertly pops off of stack and completes.", function(done) {
    function a(cb) {
      cb('a error', null);
    }

    function b(cb) {
      cb(null, 'b result');
    }

    function c(cb) {
      cb('c error', null);
    }
    let q = queue.create();
    q.add(a);
    q.add(b);
    q.add(c);

    q.run(function (errs, results) {
      expect(errs).to.be.an('array');
      expect(errs.length).to.equal(2);
      expect(errs[0]).to.equal('a error');
      expect(errs[1]).to.equal('c error');
      expect(results).to.be.an('array');
      expect(results[0]).to.equal('b result');
      done();
    });
  });

  it("Ensures queue propertly pops off of stack and completes for promises.", function(done) {
    async function a() {
      throw new Error('a error')
    }

    async function b(cb) {
      return 'b result'
    }

    async function c(cb) {
      throw new Error('c error');
    }
    let q = queue.create();
    q.add(a);
    q.add(b);
    q.add(c);

    q.runAsync(function (errs, results) {
      expect(errs).to.be.an('array');
      expect(errs.length).to.equal(2);
      expect(errs[0].message).to.equal('a error');
      expect(errs[1].message).to.equal('c error');
      expect(results).to.be.an('array');
      expect(results[0]).to.equal('b result');
      done();
    });
  });

  it("Ensures queue in parallel returns results in order.", function(done) {
    function a(cb) {
      setTimeout(function() {
        cb('a error', null);
      }, 1000);
    }

    function b(cb) {
      setTimeout(function() {
        cb(null, 'b result');
      }, 100);
    }

    function c(cb) {
      cb('c error', null);
    }
    let q = queue.create();
    q.add(a);
    q.add(b);
    q.add(c);

    q.runParallel(function (errs, results) {
      expect(errs).to.be.an('array');
      expect(errs.length).to.equal(2);
      expect(results.length).to.equal(1);
      expect(errs[0]).to.equal('a error');
      expect(errs[1]).to.equal('c error');
      expect(results).to.be.an('array');
      expect(results[0]).to.equal('b result');
      done();
    });
  });

  it("Ensures queue in parallel returns results in order for promises.", function(done) {
    async function a() {
      return new Promise((resolve, reject) => {
        setTimeout(function() {
          reject(new Error('a error'))
        }, 1000);
      });
    }

    async function b() {
      return new Promise((resolve, reject) => {
        setTimeout(function() {
          resolve('b result');
        }, 100);
      });
    }

    async function c() {
      return new Promise((resolve, reject) => {
        setTimeout(function() {
          reject(new Error('c error'))
        }, 1000);
      });
    }
    let q = queue.create();
    q.add(a);
    q.add(b);
    q.add(c);

    q.runAsyncParallel(function (errs, results) {
      expect(errs).to.be.an('array');
      expect(errs.length).to.equal(2);
      expect(results.length).to.equal(1);
      expect(errs[0].message).to.equal('a error');
      expect(errs[1].message).to.equal('c error');
      expect(results).to.be.an('array');
      expect(results[0]).to.equal('b result');
      done();
    });
  });

  it("Ensure that empty queues return", function(done) {
    let q = queue.create();
    q.run(function(errs, results) {
      expect(errs).to.be.an('array');
      expect(results).to.be.an('array');
      expect(errs.length).to.equal(0);
      expect(results.length).to.equal(0);
      let z = queue.create();
      z.runParallel(function(errs, results) {
        expect(errs).to.be.an('array');
        expect(results).to.be.an('array');
        expect(errs.length).to.equal(0);
        expect(results.length).to.equal(0);
        done();
      });
    });
  });


  it("Ensure progress works.", function(done) {
    function a(cb) {
      setTimeout(function() {
        cb('a error', null);
      }, 100);
    }

    function b(cb) {
      setTimeout(function() {
        cb(null, 'b result');
      }, 100);
    }

    function c(cb) {
      cb('c error', null);
    }
    let q = queue.create();
    let progress_amounts = 0;
    q.onprogress = function(progress) {
      progress_amounts++;
    };
    q.add(a);
    q.add(b);
    q.add(c);

    q.runParallel(function (errs, results) {
      expect(errs).to.be.an('array');
      expect(errs.length).to.equal(2);
      expect(results.length).to.equal(1);
      expect(errs[0]).to.equal('a error');
      expect(errs[1]).to.equal('c error');
      expect(results).to.be.an('array');
      expect(results[0]).to.equal('b result');
      expect(progress_amounts).to.equal(3);
      done();
    });
  });

  it("Ensure naming works", function(done) {
    function a(cb) {
      setTimeout(function() {
        cb('a error', null);
      }, 100);
    }

    function b(cb) {
      setTimeout(function() {
        cb(null, 'b result');
      }, 100);
    }

    function c(cb) {
      cb('c error', null);
    }
    let q = queue.create();
    
    q.add('this is a', a);
    q.add('this is b', b);
    q.add('this is c', c);

    q.runParallel(function (errs, results) {
      expect(results[0].name).to.equal('this is a');
      done();
    });
  });

});