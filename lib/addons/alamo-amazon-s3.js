"use strict"

module.exports = require('./alamo-addons.js')(
  'Amazon S3 Bucket',
  's3',
  'amazon-s3',
  's3',
  {
    'basic':50 * 100,
    'versioned':150 * 100
  },
  'Amazons S3 large object and asset storage.');