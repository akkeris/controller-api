/* eslint-disable strict */

'use strict';

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {});
  console.log('looking for', req.url.replace(/\//g, ''), 'in', process.env[req.url.replace(/\//g, '')]);
  res.write(process.env[req.url.replace(/\//g, '')] || 'does not exist');
  res.end();
});
server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(process.env.PORT);
