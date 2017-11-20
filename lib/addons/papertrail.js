"use strict"

const config = require('../config.js');
if(config.papertrail_drain) {
  module.exports = require('./logging-endpoint.js')(
    config.papertrail_drain, 
    'papertrail', 
    'Papertrail', 
    'Forward your apps logs to papertrail.', 
    'https://www.papertrailapp.com'
  );
} else {
  console.warn('Unable to find PAPERTRAIL_DRAIN environment variable, you will not be able to use papertrail as an addon.');
  console.warn('In addition the tests may fail (logs.js test for papertrail)')
  module.exports = function() {}
}