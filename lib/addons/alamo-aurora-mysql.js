"use strict"

module.exports = require('./alamo-addons.js')(
  'Alamo MySQL (Aurora)',
  'aurora-mysql',
  'alamo-mysql',
  'aurora-mysql',
  {
    'large':360 * 100,
    'medium':135 * 100,
    'small':60 * 100,
    'micro':0
  },
  'Dedicated and scalable Aurora MySQL relational SQL database.');
