module.exports = require('./alamo-addons.js')(
  'Alamo MongoDB',
  'mongodb',
  'alamo-mongodb',
  'mongodb',
  {
    shared: 0,
    ha: 100,
  },
  'NoSQL database',
);
