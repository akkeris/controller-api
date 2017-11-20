"use strict"

// TODO: Add support for promises..
function queue() {
  this.items = [];
  this.results = [];
  this.errors = [];

  this.add = function(name, item) {
    this.total = this.items.length;
    this.responded = 0;
    if(typeof(name) === 'string') {
      this.items.push({name, item});
    } else {
      this.items.push({name:null, item:name});
    }
  }.bind(this);

  this.run = function(cb) {
    if(this.items.length === 0) {
      cb(this.errors, this.results);
    } else {
      let runner = this.items.shift();
      runner.item(function(err, result) {
        this.responded++;
        if(this.onprogress) {
          this.onprogress(this.responded/this.total);
        }
        if(err) {
          this.errors.push(runner.name ? {name:runner.name, err} : err);
        }
        if(result) {
          this.results.push(runner.name ? {name:runner.name, result} : result);
        }
        setTimeout(this.run.bind(this, cb), 10);
      }.bind(this));
    }
  }.bind(this);

  this.runAsync = function(cb) {
    if(this.items.length === 0) {
      cb(this.errors, this.results);
    } else {
      let runner = this.items.shift();
      runner.item().then(function(result) {
        this.responded++;
        if(this.onprogress) {
          this.onprogress(this.responded/this.total);
        }
        this.results.push(runner.name ? {name:runner.name, result} : result);
        setTimeout(this.runAsync.bind(this, cb), 10);
      }.bind(this)).catch(function(err) {
        this.responded++;
        if(this.onprogress) {
          this.onprogress(this.responded/this.total);
        }
        this.errors.push(runner.name ? {name:runner.name, err} : err);
        setTimeout(this.runAsync.bind(this, cb), 10);
      }.bind(this))
    }
  }.bind(this);

  this.runParallel = function(cb) {
    this.total = this.items.length;
    this.responded = 0;
    let responder = function(ndx, name, err, result) {
      if(name) {
        this.errors[ndx] = {name, err};
        this.results[ndx] = {name, result};
      } else {
        this.errors[ndx] = err;
        this.results[ndx] = result;
      }
      this.responded++;
      if(this.onprogress) {
        this.onprogress(this.responded/this.total);
      }
      if(this.responded === this.total) {
        let errs = [], res = [];
        this.errors.forEach((e) => {
          if(e) {
            errs.push(e);
          }
        });
        this.results.forEach((e) => {
          if(e) {
            res.push(e);
          }
        });
        cb(errs, res);
      }
    };
    this.items.forEach(function(runner, ndx) {
      if(runner.name) {
        runner.item(responder.bind(this, ndx, runner.name))
      } else {
        runner.item(responder.bind(this, ndx, null))
      }
    }.bind(this));
    if(this.items.length === 0) {
      cb([], []);
    }
  }
  this.runAsyncParallel = function(cb) {
    this.total = this.items.length;
    this.responded = 0;
    let done = function() {
      this.responded++;
      if(this.onprogress) {
        this.onprogress(this.responded/this.total);
      }
      if(this.responded === this.total) {
        let errs = [], res = [];
        this.errors.forEach((e) => {
          if(e) {
            errs.push(e);
          }
        });
        this.results.forEach((e) => {
          if(e) {
            res.push(e);
          }
        });
        cb(errs, res);
      }
    }.bind(this)
    let success_responder = function(ndx, name,result) {
      if(name) {
        this.results[ndx] = {name, result};
      } else {
        this.results[ndx] = result;
      }
      done()
    };

    let fail_responder = function(ndx, name, err) {
      if(name) {
        this.errors[ndx] = {name, err};
      } else {
        this.errors[ndx] = err;
      }
      done()
    };
    this.items.forEach(function(runner, ndx) {
      if(runner.name) {
        runner.item().then(success_responder.bind(this, ndx, runner.name)).catch(fail_responder.bind(this, ndx, runner.name))
      } else {
        runner.item().then(success_responder.bind(this, ndx, null)).catch(fail_responder.bind(this, ndx, null))
      }
    }.bind(this));
    if(this.items.length === 0) {
      cb([], []);
    }
  }
  this.onprogress = null;

  this.progress = function() {
    return this.responded / this.total;
  }
}
module.exports = {
  create:function() {
    return new queue();
  }
}