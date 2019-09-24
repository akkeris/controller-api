const httph = require('./http_helper.js');
const common = require('./common.js');

module.exports = (function() {
  var authorization = function(method, path, authorizers) {
    var pfunc = this[method][path];
    this[method][path] = async function() {
      if(process.env.DEBUG === "true") {
        console.info('[debug] ' + method + ' ' + path);
      }
      var req = arguments[0];
      var res = arguments[1];
      // One authorizer must return true for this to be valid.
      var valid = false;
      authorizers.forEach(function(authorizer) {
        if(!valid && authorizer.auth(req, req.headers.authorization)) {
          valid = true;
        }
      });
      if(valid === true) {
        await pfunc.apply(null, arguments);
      } else {
        res.writeHead(401, {});
        res.end();
      }
    }.bind(this);
    return options.call(this, method, path);
  };
  var options = function(method, path) {
    var obj = {
      authorization:authorization.bind(this, method, path)
    };
    Object.defineProperty(obj, 'with', {get:options.bind(this, method, path)});
    Object.defineProperty(obj, 'and', {get:options.bind(this, method, path)});
    return obj;
  };
  var run = function(method, path, func) {
    if(!process.env.TEST_MODE) {
      console.log('Successfully registered', method, path);
    }
    this[method][path] = func;
    return options.call(this, method, path);
  };
  var add = function(method, path) {
    var rfunc = null;
    if(Array.isArray(path)) {
      path.forEach(function(p) {
        rfunc = run.bind(this, method, p);
      }.bind(this));
    } else {
      rfunc = run.bind(this, method, path);
    }
    return { run:rfunc };
  };
  var obj = {};
  obj.get = {};
  obj.patch = {};
  obj.post = {};
  obj.put = {};
  obj.options = {};
  obj.delete = {};
  obj.trace = {};
  obj.head = {};
  obj.websocket = {};
  obj.cache = {};
  obj.add = {
    get:add.bind(obj, 'get'),
    patch:add.bind(obj, 'patch'),
    post:add.bind(obj, 'post'),
    put:add.bind(obj, 'put'),
    delete:add.bind(obj, 'delete'),
    options:add.bind(obj, 'options'),
    websocket:add.bind(obj, 'websocket'),
    default:function(func) { this.default = func; }.bind(obj)
  };
  obj.process = async function(method, path, req, res) {
    if(this[method][path]) {
      this[method][path](req, res);
      return;
    } else {
      var found = false;
      Object.keys(this[method]).forEach((async function(e) {
        var m = path.match(new RegExp(e));
        if(m && m.length > 0 && found === false) {
          found = true;
          try {
            if(req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('gzip') > -1) {
              res.supportsGzip = true
            }
            await this[method][e](req, res, e)
          } catch (e) {
            if(e instanceof common.HttpError) {
              httph.respond(e.code, res, e.message)
            } else {
              httph.respond(500, res, "Internal Server Error")
              console.error('Error:', e);
              if(e.stack) {
                console.error(e.stack);
              }
            }
          }
          return;
        }
      }.bind(this)));
      if(!found) {
        this.default(req, res);
      }
    }
  }.bind(obj);
  return obj;
}());