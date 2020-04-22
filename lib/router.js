const httph = require('./http_helper.js');
const common = require('./common.js');

module.exports = (function () {
  let options = null;
  const authorization = function (method, path, authorizers) {
    const pfunc = this[method][path];
    this[method][path] = async function (...args) {
      const req = args[0];
      const res = args[1];
      if (process.env.DEBUG === 'true') {
        console.info(`[debug] ${method} ${path} ${req.url}`);
      }
      // One authorizer must return true for this to be valid.
      let valid = false;
      await Promise.all(authorizers.map(async (authorizer) => {
        try {
          if (!valid && await authorizer(req, req.headers.authorization)) {
            valid = true;
          }
        } catch (e) {
          console.log('Error in authorizor:', e);
          valid = false;
        }
      }));
      if (valid === true) {
        await pfunc.apply(null, args); // eslint-disable-line
      } else {
        res.writeHead(401, {});
        res.end();
      }
    };
    return options.call(this, method, path);
  };
  options = function (method, path) {
    const obj = {
      authorization: authorization.bind(this, method, path),
    };
    Object.defineProperty(obj, 'with', { get: options.bind(this, method, path) });
    Object.defineProperty(obj, 'and', { get: options.bind(this, method, path) });
    return obj;
  };
  const run = function (method, path, func) {
    if (!process.env.TEST_MODE) {
      console.log('Successfully registered', method, path);
    }
    this[method][path] = func;
    return options.call(this, method, path);
  };
  const add = function (method, path) {
    let rfunc = null;
    if (Array.isArray(path)) {
      path.forEach((p) => {
        rfunc = run.bind(this, method, p);
      });
    } else {
      rfunc = run.bind(this, method, path);
    }
    return { run: rfunc };
  };
  const obj = {};
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
    get: add.bind(obj, 'get'),
    patch: add.bind(obj, 'patch'),
    post: add.bind(obj, 'post'),
    put: add.bind(obj, 'put'),
    delete: add.bind(obj, 'delete'),
    options: add.bind(obj, 'options'),
    websocket: add.bind(obj, 'websocket'),
    default: function (func) { this.default = func; }.bind(obj),
  };
  obj.process = async function (method, path, req, res) {
    if (this[method][path]) {
      this[method][path](req, res);
    } else {
      let found = false;
      Object.keys(this[method]).forEach((async (e) => {
        const m = path.match(new RegExp(e));
        if (m && m.length > 0 && found === false) {
          found = true;
          try {
            if (req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('gzip') > -1) {
              res.supportsGzip = true;
            }
            await this[method][e](req, res, e);
          } catch (err) {
            if (err instanceof common.HttpError) {
              httph.respond(err.code, res, err.message);
            } else {
              httph.respond(500, res, 'Internal Server Error');
              console.error('Error:', err);
              if (err.stack) {
                console.error(err.stack);
              }
            }
          }
        }
      }));
      if (!found) {
        this.default(req, res);
      }
    }
  }.bind(obj);
  return obj;
}());
