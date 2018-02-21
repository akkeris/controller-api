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
  'Alamo ElasticSearch',
  'es',
  'alamo-es',
  'es',
  {
    'micro':25*100,
    'small':55*100,
    'medium':115*100,
    'large':225*100
  },
  'Dedicated ElasticSearch.',
  {
    'status':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.es.status(pg_pool, app.space, app.name, service_id)
      }
    } 
    ,
    'info':[
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("status").digest(), 16),
        "label":"get status",
        "action":"status",
        "url":"",
        "requires_owner":true
      }
    ]
  });
