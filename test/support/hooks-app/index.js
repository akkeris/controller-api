const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {});
  res.write('hello');
  res.end();
});
server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(5000);
