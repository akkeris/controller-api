module.exports = require('./alamo-addons.js')(
  'Alamo RabbitMQ',
  'rabbitmq',
  'alamo-rabbitmq',
  'rabbitmq',
  {
    live: 100 * 100,
    sandbox: 0,
  },
  'Easy to use, scalable cloud messaging',
);
