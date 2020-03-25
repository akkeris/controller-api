let undef;

module.exports = require('./alamo-addons.js')(
  // long_name
  'Kafka',
  // short_name
  'kafka',
  // keyed_name
  'kafka',
  // alamo_name
  'kafka',
  // plan_price
  {
    nonprod: 0,
    prod: 0,
  },
  // description
  'Managed collection of Kafka topics for event streaming.',
  undef, undef, undef, false,
);
