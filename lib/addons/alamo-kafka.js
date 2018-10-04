"use strict"

const common = require('../common.js')
const crypto = require('crypto')
const uuid = require('uuid')

function get_regions(plans, size) {
  return plans.filter((x) => x.size === size) // only plans matching size
              .map((x) => x.regions) // grab the regions array
              .reduce((sum, x) => sum.concat(x), []) // normalize arrays of arrays
              .filter((x, i, self) => self.indexOf(x) === i) // get unique entries.
}

module.exports = require('./alamo-addons.js')(
  //long_name
  'Kafka',
  //short_name
  'kafka',
  //keyed_name
  'kafka',
  //alamo_name
  'kafka',
  //plan_price
  {
    'nonprod':0,
    'prod':0,
  },
  //description
  'Managed collection of Kafka topics for event streaming.');
