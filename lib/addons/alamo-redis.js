"use strict"

const config = require('../config.js');
const crypto = require('crypto');
const uuid = require('uuid');
const httph = require('../http_helper.js');

module.exports = require('./alamo-addons.js')(
  'Alamo Redis',
  'redis',
  'alamo-redis',
  'redis',
  {
    'large':135 * 100,
    'medium':50 * 100,
    'small':15 * 100
  },
  'Reliable and powerful Redis as a service.');
