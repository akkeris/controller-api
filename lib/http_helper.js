/* eslint-disable max-classes-per-file */

const https = require('https');
const http = require('http');
const url = require('url');
const util = require('util');
const zlib = require('zlib');

class HttpError extends Error {
  constructor(...params) {
    super(...params);
    this.fatal = false;
    this.code = 0;
  }
}

class NotFoundError extends HttpError {
  constructor(message = 'The specified resource was not found' /* resource = '' */) {
    super(message);
    this.code = 404;
  }
}

class InternalServerError extends HttpError {
  constructor(error = { message: '' }) {
    super('Internal Server Error');
    this.code = 500;
    this.internal_error = error;
  }
}

class NotImplementedError extends HttpError {
  constructor(error = { message: '' }) {
    super('Not Implemented Error');
    this.code = 501;
    this.internal_error = error;
  }
}

class BadRequestError extends HttpError {
  constructor(message = 'Bad Request') {
    super(message);
    this.code = 400;
  }
}

class ServiceUnavailableError extends HttpError {
  constructor(error = { message: '' }) {
    super('Service Unavailable Error');
    this.code = 503;
    this.internal_error = error;
  }
}

class UnprocessibleEntityError extends HttpError {
  constructor(message = 'Unprocessible Entity') {
    super(message);
    this.code = 422;
  }
}

class UnauthorizedError extends HttpError {
  constructor(message = 'Unathorized') {
    super(message);
    this.code = 403;
  }
}

class NotAllowedError extends HttpError {
  constructor(message = 'This operation is not allowed.') {
    super(message);
    this.code = 403;
  }
}

class ConflictError extends HttpError {
  constructor(message = 'A conflict occured when trying this operation.') {
    super(message);
    this.code = 409;
  }
}

class NoFormationsFoundError extends HttpError {
  constructor(message = 'This application does not have any formations') {
    super(message);
    this.code = 409;
  }
}
class WaitingForResourcesError extends HttpError {
  constructor(message = "We're currently waiting on resources to be created, try again in five minutes.") {
    super(message);
    this.code = 424;
  }
}

function clean_forward_slash(uri) {
  if (!uri) {
    return uri;
  }
  if (uri[uri.length - 1] === '/') {
    uri = uri.substring(0, uri.length - 1);
  }
  if (!uri.startsWith('http')) {
    uri = `https://${uri}`;
  }
  return uri;
}

function first_match(uri, regex) {
  const matches = (new RegExp(regex)).exec(uri);
  if (matches && matches[1]) {
    return matches[1];
  }
  return null;
}

function second_match(uri, regex) {
  const matches = (new RegExp(regex)).exec(uri);
  if (matches && matches[2]) {
    return matches[2];
  }
  return null;
}

function third_match(uri, regex) {
  const matches = (new RegExp(regex)).exec(uri);
  if (matches && matches[3]) {
    return matches[3];
  }
  return null;
}

function fourth_match(uri, regex) {
  const matches = (new RegExp(regex)).exec(uri);
  if (matches && matches[4]) {
    return matches[4];
  }
  return null;
}

function fifth_match(uri, regex) {
  const matches = (new RegExp(regex)).exec(uri);
  if (matches && matches[5]) {
    return matches[5];
  }
  return null;
}

function common_headers() {
  return {
    'Content-Type': 'application/json',
    'RateLimit-Remaining': 2400,
  };
}

function valid_response(code, res, message) {
  if (res.supportsGzip) {
    res.writeHead(code, { 'content-encoding': 'gzip', ...common_headers() });
    zlib.gzip(Buffer.from(typeof (message) === 'string' ? message : JSON.stringify(message)), (err, data) => {
      if (err) {
        console.error('Unable to compress data stream!', err);
      }
      res.write(data || '');
      res.end();
    });
  } else {
    res.writeHead(code, common_headers());
    res.write(typeof (message) === 'string' ? message : JSON.stringify(message));
    res.end();
  }
}
const ok_response = valid_response.bind(valid_response, 200);
const created_response = valid_response.bind(valid_response, 201);
const accepted_response = valid_response.bind(valid_response, 202);
const reset_response = valid_response.bind(valid_response, 205);
const no_content_response = valid_response.bind(valid_response, 204);

async function buffer(stream) {
  return new Promise((res /* rej */) => {
    let buffered = Buffer.alloc(0);
    stream.on('data', (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
    });
    stream.on('error', (err) => {
      console.log('stream error:', err);
    });
    stream.on('end', () => {
      res(buffered);
    });
  });
}

async function buffer_json(stream) {
  try {
    const data = await buffer(stream);
    return JSON.parse(data.toString('utf8'));
  } catch (e) {
    throw new BadRequestError(e);
  }
}


function buffer_cb(stream, callback) {
  let buffered = Buffer.alloc(0);
  stream.on('data', (chunk) => {
    buffered = Buffer.concat([buffered, chunk]);
  });
  stream.on('end', () => {
    callback(buffered);
  });
}


function request_cb(type, uri, headers, data, callback) {
  try {
    const options = {};
    options.method = type;
    options.headers = headers || {};
    const client = uri.startsWith('http://') ? http : https;
    let callback_made = false;
    const req = client.request((new url.URL(uri)), options, (res) => {
      if (callback_made) {
        return; // silently swallow this, as we've already sent a callback.
      }
      buffer_cb(res, (res_data) => {
        callback_made = true;
        if ((res.statusCode < 200 || res.statusCode > 299) && res.statusCode !== 302) {
          callback({ code: res.statusCode, headers: res.headers, message: (Buffer.isBuffer(res_data) ? res_data.toString('utf8') : res_data) }, null);
        } else {
          const done = () => {
            if (headers['x-response']) {
              callback(null, res);
            } else if (headers['X-Binary']) {
              callback(null, res_data, res);
            } else if (headers['X-JSON']) {
              callback(null, JSON.parse(res_data.toString('utf8')), res);
            } else {
              callback(null, res_data.toString('utf8'), res);
            }
          };
          if (res.headers['content-encoding'] === 'gzip') {
            zlib.gunzip(res_data, (err, d) => {
              res_data = d;
              done();
            });
          } else {
            done();
          }
        }
      });
    });
    if (type && type.toLowerCase() === 'delete' && data) {
      req.useChunkedEncodingByDefault = true;
    }
    if (headers && headers['X-Timeout']) {
      req.setTimeout(headers['X-Timeout'], () => {
        if (callback_made) {
          return; // silently swallow this, as we've already sent a callback.
        }
        callback_made = true;
        callback({ code: 0, message: 'timeout occured.' });
      });
    } else {
      req.setTimeout(60 * 1000, () => {
        if (callback_made) {
          return; // silently swallow this, as we've already sent a callback.
        }
        callback_made = true;
        console.error('Timeout after one minute trying to retrieve', type, uri);
        callback({ code: 0, message: 'timeout occured.' });
      });
    }
    if (data) {
      req.write(typeof (data) === 'string' ? data : JSON.stringify(data));
    }
    req.on('error', (e) => {
      if (callback_made) {
        return; // silently swallow this, we've already disconnected from the client.
      }
      callback_made = true;
      callback({ code: 500, message: Buffer.isBuffer(e) ? e.toString('utf8') : e.toString() }, null);
    });
    req.end();
  } catch (e) {
    callback({ code: 500, message: Buffer.isBuffer(e) ? e.toString('utf8') : e.toString() }, null);
  }
}

// TODO: ESLint - this function needs a consistent return value without breaking everything
// eslint-disable-next-line
async function request(type, uri, headers, data, callback) {
  let stack = null;
  try { throw new Error(); } catch (s) {
    stack = s.stack;
  }
  headers = headers || {};
  if (callback) {
    request_cb(type, uri, headers, data, callback);
  } else {
    try {
      return await util.promisify(request_cb)(type, uri, headers, data);
    } catch (e) {
      e.headers = e.headers || {};
      if (e.code === 412) {
        throw new WaitingForResourcesError(e);
      }
      if (!e.headers['x-ignore-errors'] && !headers['x-ignore-errors']) {
        if (!headers['x-silent-error']) {
          console.error(`Error from backend service: ${type} ${uri} -> ${e.code}`);
          console.error(e);
          if (e.stack) {
            console.error(e.stack);
          } else {
            console.error(stack);
          }
          throw new ServiceUnavailableError(e);
        } else {
          throw e;
        }
      }
    }
  }
}

module.exports = {
  request,
  respond: valid_response,
  response: valid_response,
  buffer,
  buffer_json,
  first_match,
  second_match,
  third_match,
  fourth_match,
  fifth_match,
  ok_response,
  created_response,
  accepted_response,
  reset_response,
  no_content_response,
  clean_forward_slash,
  HttpError,
  InternalServerError,
  BadRequestError,
  ServiceUnavailableError,
  UnprocessibleEntityError,
  NotAllowedError,
  ConflictError,
  NoFormationsFoundError,
  NotFoundError,
  WaitingForResourcesError,
  UnauthorizedError,
  NotImplementedError,
};
