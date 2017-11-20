'use strict';

var util = require('util');
var url = require('url');
var request = require('request');
const {promisify} = require('util');

var API = '/api/json';
var NEWJOB = '%s/createItem/?name=%s';
var DELETE = '%s/job/%s/doDelete';
var BUILD = '%s/job/%s/build' + API;
var STOP_BUILD = '%s/job/%s/%s/kill' + API;
var BUILD_INFO = '%s/job/%s/%s' + API;
var DISABLE = '%s/job/%s/disable';
var ENABLE = '%s/job/%s/enable';
var BUILDWITHPARAMS = '%s/job/%s/buildWithParameters' + API;
var CONFIG = '%s/job/%s/config.xml';
var JOBINFO = '%s/job/%s' + API;
var LIST = '%s' + API;
var LIST_VIEW = '%s/view/%s' + API;
var LAST_SUCCESS = '%s/job/%s/lastSuccessfulBuild' + API;
var TEST_REPORT = '%s/job/%s/lastSuccessfulBuild/testReport' + API;
var LAST_BUILD = '%s/job/%s/lastBuild' + API;
var LAST_COMPLETED_BUILD = '%s/job/%s/lastCompletedBuild' + API;
var LAST_REPORT = '%s/job/%s/lastBuild' + API;
var QUEUE = '%s/queue' + API;
var QUEUE_ITEM = '%s/queue/item/%s' + API;
var QUEUE_STOP = '%s/queue/cancelItem?id=%s';
var COMPUTERS = '%s/computer' + API;
var JOB_OUTPUT = '%s/job/%s/consoleText' + API;


var init = exports.init = function(host, options) {
  options = options || {};
  // If we end up having auth we need to provide a mechanism for crumb/CSFR support
  if(host.indexOf("@") !== -1 || options.auth) {
    var refreshCrumb = function() {
      // Get CSRF protection crumb, if it doesnt exist, its not the end of the world, so long as there isnt auth or CSFR is disabled.
      request({method:'get', url:host + '/crumbIssuer/api/xml'}, function(err, resp, body) {
        if(!err && body) {
          var crumbs = body.match(/\<crumb\>([A-z0-9\-]+)\<\/crumb\>/);
          var crumbRequestField = body.match(/\<crumbRequestField\>([A-z0-9\-]+)\<\/crumbRequestField\>/);
          if(crumbs !== null && crumbRequestField !== null && crumbs && crumbRequestField && crumbs[1] && crumbRequestField[1]) {
            options.headers = options.headers || {};
            options.headers[crumbRequestField[1]] = crumbs[1];
            request = request.defaults(options);
          }
        }
      });
    }
    refreshCrumb();
    // refresh the crumb every 1 minute
    setInterval(refreshCrumb, 60 * 1000);
  }

  /*options = options || {};
  var parsed_url = url.parse(host);
  host = parsed_url.protocol + "//" + parsed_url.host;
  console.log("Parsed url:", parsed_url)
  if(parsed_url.auth && !options.auth) {

    options.auth = {user:parsed_url.auth.split(":")[0], pass:parsed_url.auth.split(":")[1]};
    console.log("Using auth:", options.auth)
  }*/
  if (options) {
    request = request.defaults(options);
  }

  //Helper Functions
  var build_url = function(command) {
    var url = util.format.call(this, command, host);
    if (arguments.length === 1) {
      return url;
    }
    var args = Array.prototype.slice.call(arguments).slice(1);
    args.unshift(url);
    url = util.format.apply(this, args);
    return url;
  };
  return {
    build: promisify(function(jobname, params, callback) {
      // httph.request('post', build_url(BUILD, jobname) + '?delay=0sec', {}, null, (err, resp) =>{})
      var buildurl = build_url(BUILD, jobname);
      var reqOpts = {method: 'POST', url: buildurl + "?delay=0sec"};
      var r = request(reqOpts, function(error, response, body) {
        if ( error || (response.statusCode !== 201 && response.statusCode !== 302) ) {
          return callback(error || {code:response.statusCode}, null);
        }
        this.last_build_info(jobname, function(err, body) {
          if(err) {
            return callback(err, null);
          } else {
            callback(null, body);
          }
        }.bind(this));
      }.bind(this));

      var form = r.form();
      var parameter = [];
      Object.keys(params).forEach((key) => {
        parameter.push({name:key, value:params[key]});
      });
      form.append("json", JSON.stringify({"parameter":parameter}));
    }),
    stop_build: promisify(function(jobname, buildNumber, callback) {
      // httph.request('post', build_url(STOP_BUILD, jobname, buildNumber), {}, null, (err, resp) =>{})
      var buildurl = build_url(STOP_BUILD, jobname, buildNumber);
      request({method: 'POST', url: buildurl }, function(error, response) {
        if ( error || (response.statusCode !== 200 && response.statusCode !== 201 && response.statusCode !== 302) ) {
          return callback(error || {code:response.statusCode}, null);
        }
        callback(null, "job is stopped");
      });
    }),
    job_info: promisify(function(jobname, callback) {
      // httph.request('get', build_url(JOB_INFO, jobname), {}, null, (err, resp) =>{})
      request({method: 'GET', url: build_url(JOBINFO, jobname)}, function(error, response, body) {
        if ( error || response.statusCode !== 200 ) {
          return callback(error || {code:response.statusCode}, null);
        }
        callback(null, JSON.parse(body.toString()));
      });
    }),
    last_build_info: promisify(function(jobname, callback) {
      // httph.request('get', build_url(LAST_BUILD, jobname), {}, null, (err, resp) =>{})
      request({method: 'GET', url: build_url(LAST_BUILD, jobname)}, function(error, response, body) {
        if ( error || response.statusCode !== 200 ) {
          return callback(error || {code:response.statusCode}, null);
        }
        callback(null, JSON.parse(body.toString()));
      });
    }),
    build_info: promisify(function(jobname, number, callback) {
      // httph.request('get', build_url(BUILD_INFO, jobname, number), {}, null, (err, resp) =>{})
      request({method: 'GET', url: build_url(BUILD_INFO, jobname, number)}, function(error, response, body) {
        if ( error || response.statusCode !== 200 ) {
          return callback(error || {code:response.statusCode}, null);
        }
        callback(null, JSON.parse(body.toString()));
      });
    }),
    create_job: promisify(function(jobname, job_config, callback) {
    // httph.request('post', build_url(NEWJOB, jobname), {'content-type':'application/xml'}, job_config, (err, resp) =>{})
     request( { method: 'POST', url: build_url(NEWJOB, jobname), body: job_config, headers: { "content-type": "application/xml"} }, 
        function(error, response, body) {
          if ( error || response.statusCode !== 200 ) {
            return callback(error || {code:response.statusCode}, null);
          }
          callback(null, body);
        }
      );
    }),
    delete_job: promisify(function(jobname, callback) {
      // httph.request('post', build_url(DELETE, jobname), {}, null, (err, resp) =>{})
      request({method: 'POST', url: build_url(DELETE, jobname)}, function(error, response, body) {
        if ( error || response.statusCode === 404 ) {
          return callback(error || {code:response.statusCode}, null);
        }
        callback(null, body);
      });
    }),
    job_output: promisify(function(jobname, buildname, callback) {
      // httph.request('post', build_url(JOB_OUTPUT, jobname + '/' + buildname), {}, null, (err, resp) =>{})
      request({method: 'POST', url: build_url(JOB_OUTPUT, jobname + '/' + buildname)}, function(error, response, body) {
        if (response.statusCode !== 200 || error) {
          return callback(error || {code:response.statusCode}, null);
        }
        var data = JSON.stringify({"output": body});
        callback(null, JSON.parse(data));
      });
    })
  };
};