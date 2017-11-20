"use strict"

const common = require('../common.js')
const config = require('../config.js')
const crypto = require('crypto')
const uuid = require('uuid')
const httph = require('../http_helper.js')

module.exports = require('./alamo-addons.js')(
  'Alamo Memcached',
  'memcached',
  'alamo-memcached',
  'memcached',
  {
    'large':135 * 100,
    'medium':50 * 100,
    'small':15 * 100
  },
  'Reliable and powerful fast caching in memory-as-a-service',
  {
    'stats':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1];
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found on memcached instance.")
        }
        return await common.alamo.memcached.stats(pg_pool, app.space, app.name, service_id)
      }
    },
    'flush':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url, cb) {
        let service_id = service.foreign_key.split(':')[1];
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found on memcached instance.")
        }
        return await common.alamo.memcached.flush(pg_pool, app.space, app.name, service_id)
      }
    },
    'info':[
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("memcached:stats").digest(), 16),
        "label":"Retrieve stats for the specified memcached instance.",
        "action":"stats",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("memcached:flush").digest(), 16),
        "label":"Flush all cache items from stats.",
        "action":"flush",
        "url":"",
        "requires_owner":true
      }
    ]
  });