
"use strict"

let caught_signals = {};

const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {});
  res.write(JSON.stringify(caught_signals, null, 2));
  res.end();
});
server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(parseInt(process.env.PORT || "9000",10));

function mark(signal) {
	caught_signals[signal] = true;
}

process.on('SIGHUP', mark.bind(null, 'SIGHUP'))
process.on('SIGINT', mark.bind(null, 'SIGINT'))
process.on('SIGTERM', mark.bind(null, 'SIGTERM'))
process.on('SIGQUIT', mark.bind(null, 'SIGQUIT'))
process.on('SIGABRT', mark.bind(null, 'SIGABRT'))
process.on('SIGUSR1', mark.bind(null, 'SIGUSR1'))