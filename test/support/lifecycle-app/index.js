
"use strict"

const http = require('http');
process.env.RETURN_VALUE = process.env.RETURN_VALUE || "setting return value failed."
const server = http.createServer((req, res) => {
  res.writeHead(200, {});
  res.write("[" + process.env.RETURN_VALUE + "] with port [" + process.env.PORT + "]");
  res.end();
});
server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
// this is purposely 5000 as we'll start the app on 9000, and try changing the port to
// 5000 to see if it spins up/changes and how fast.
server.listen(5000);