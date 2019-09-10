
// Do not include anything from the rest of the project here
// including common.js.

const http = require('http')
const https = require('https')
const url = require('url')
const halfMb = 1024 * 512; // Restrict response from unknown web servers to half a megabyte.

function test(hook_url) {
  if(hook_url.toLowerCase().startsWith('https://')) {
    return true
  } else if (hook_url.toLowerCase().startsWith("http://")) {
    return true
  } else {
    return false
  }
}

function fire(id, hook_url, type, payload, hmac, headers = {}) {
  return new Promise((response, reject) => {
    if(!test(hook_url)) {
      return reject('unable to fire webhook:', hook_url, 'as http or https');
    }
    let options = url.parse(hook_url);
    options.headers = options.headers || headers;
    options.headers['x-appkit-event'] = type;
    options.headers['x-appkit-delivery'] = id;
    options.headers['content-type'] = 'application/json';
    options.headers['content-length'] = Buffer.byteLength(JSON.stringify(payload));
    options.headers['user-agent'] = 'appkit-hookshot';
    options.method = 'post';
    options.headers['x-appkit-signature'] = ('sha1=' + hmac);
    let recorded_result = false;
    let req = (hook_url.startsWith("https://") ? https : http).request(options, (res) => {
      let data = Buffer.alloc(0)
      res.on('data', (chunk) => {
        if (!recorded_result) {
          if (data.length > halfMb || chunk > halfMb) {
            recorded_result = true;
            response({sent_metadata:options.headers, sent_data:payload, received_code:res.statusCode, received_metadata:res.headers, received_data:data})
            return
          }
          Buffer.concat([data, chunk])
        }
      });
      res.on('end', () => {
        if (!recorded_result) {
          recorded_result = true;
          response({sent_metadata:options.headers, sent_data:payload, received_code:res.statusCode, received_metadata:res.headers, received_data:data})
        }
      });
    });
    req.on('error', (e) => {
      if (!recorded_result) {
        recorded_result = true;
        reject(e)
      }
    });
    if (typeof payload === "string" || Buffer.isBuffer(payload)) {
      req.write(payload);
    } else {
      req.write(JSON.stringify(payload));
    }
    req.end();
  })
}

module.exports = {
  test,
  fire,
  enabled:() => true,
  name: "HTTPS",
  description: "Send an http or https webhook to remote end point.",
  format: "https://username:secret@host.com:port/path?param=value&param=value"
}