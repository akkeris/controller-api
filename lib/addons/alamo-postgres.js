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
  'Alamo Postgres',
  'postgresql',
  'alamo-postgresql',
  'postgres',
  {
    'micro':0,
    'large':360 * 100,
    'medium':135 * 100,
    'small':60 * 100,
    'hobby':0,
    'standard-0':5 * 100,
    'standard-1':15 * 100,
    'standard-2':45 * 100,
    'premium-0':60 * 100,
    'premium-1':135 * 100,
    'premium-2':720 * 100,
  },
  'Dedicated and scalable PostgreSQL relational SQL database.',
  {
    'backups':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgres.backups.list(pg_pool, app.space, app.name, service_id)
      }
    },
    'backups-capture':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url, payload) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgres.backups.capture(pg_pool, app.space, app.name, service_id)
      }
    },
    'backups-restore':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url, payload) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        if(!payload || !payload.backup || payload.backup === '') {
          throw new common.BadRequestError("No backup was provided to restore.")
        }
        return await common.alamo.postgres.backups.restore(pg_pool, app.space, app.name, service_id, action_id, req_url, payload.backup)
      }
    },
    'credentials':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgres.credentials.list(pg_pool, app.space, app.name, service_id)
      }
    },
    'credentials-create':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        console.log("creating:", app.space, app.name, service_id)
        return await common.alamo.postgres.credentials.create(pg_pool, app.space, app.name, service_id)
      }
    },
    'credentials-destroy':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url, payload) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        if(!payload || !payload.role || payload.role === '') {
          throw new common.BadRequestError("No role was provided to remove.")
        }
        return await common.alamo.postgres.credentials.destroy(pg_pool, app.space, app.name, service_id, action_id, req_url, payload.role)
      }
    },
    'credentials-rotate':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url, payload) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        if(!payload || !payload.role || payload.role === '') {
          throw new common.BadRequestError("No role was provided to rotate.")
        }
        return await common.alamo.postgres.credentials.rotate(pg_pool, app.space, app.name, service_id, action_id, req_url, payload.role)
      }
    },
    'logs':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgres.logs(pg_pool, app.space, app.name, service_id)
      }
    },
    'restart':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgres.restart(pg_pool, app.space, app.name, service_id)
      }
    },
    'psql':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        throw new common.NotFoundError("This service is not yet available.")
      }
    },
    'info':[
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:backups").digest(), 16),
        "label":"list database backups",
        "action":"backups",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:backups:capture").digest(), 16),
        "label":"capture a new backup",
        "action":"backups:capture",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:backups:restore").digest(), 16),
        "label":"restore a new backup",
        "action":"backups:restore",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:credentials").digest(), 16),
        "label":"list all credentials for this database",
        "action":"credentials",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:credentials:create").digest(), 16),
        "label":"create credentials for this database",
        "action":"credentials:create",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:credentials:destroy").digest(), 16),
        "label":"destroy credential within this database",
        "action":"credentials:destroy",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:credentials:rotate").digest(), 16),
        "label":"rotate credentials for this user",
        "action":"credentials:rotate",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:logs").digest(), 16),
        "label":"get latest logs for this database",
        "action":"pg:logs",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:restart").digest(), 16),
        "label":"restart the database",
        "action":"pg:restart",
        "url":"",
        "requires_owner":true
      },
      {
        "id":uuid.unparse(crypto.createHash('sha256').update("pg:psql").digest(), 16),
        "label":"open a psql shell to this database",
        "action":"pg:psql",
        "url":"",
        "requires_owner":true
      },
    ]
  },
  function transform_from_alamo_plans(plans) {
    return [
      {
        "size":"micro",
        "description":"512MB space, 1GB memory, 1x CPU",
        "state":"shutdown",
        "regions":get_regions(plans, "micro"),
        "attributes":{
          "Postgres Extensions":false,
          "RAM":"1GB Memory",
          "Direct SQL Access":true,
          "Row Limit":10000000,
          "Storage Capacity":"5GB",
          "Data Clips":false,
          "Connection Limit":20,
          "High Availability":false,
          "Rollback":"",
          "Encryption At Rest":false,
          "High speed SSD I/O":false,
          "Burstable Performance":false,
          "Dedicated":false
        }
      },
      {
        "size":"small",
        "description":"20GB space, 4GB memory, 2x CPU, Dedicated",
        "state":"shutdown",
        "regions":get_regions(plans, "small"),
        "attributes":{
          "Postgres Extensions":true,
          "RAM":"4GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"20GB",
          "Data Clips":true,
          "Connection Limit":120,
          "High Availability":false,
          "Rollback":"1 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":false,
          "Dedicated":true
        }
      },
      {
        "size":"medium",
        "description":"50GB space, 8GB memory, 2x CPU, Dedicated",
        "state":"shutdown",
        "regions":get_regions(plans, "medium"),
        "attributes":{
          "Postgres Extensions":true,
          "RAM":"8GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"50GB",
          "Data Clips":true,
          "Connection Limit":120,
          "High Availability":false,
          "Rollback":"1 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":false,
          "Dedicated":true
        }
      },
      {
        "size":"large",
        "description":"100GB space, 16GB memory, 4x CPU, Dedicated, High Availability",
        "state":"shutdown",
        "regions":get_regions(plans, "large"),
        "attributes":{
          "Postgres Extensions":true,
          "RAM":"16GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"100GB",
          "Data Clips":true,
          "Connection Limit":500,
          "High Availability":true,
          "Rollback":"4 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":false,
          "Dedicated":true
        }
      },
      {
        "size":"hobby",
        "description":"512MB space, 1GB memory, 1x CPU",
        "state":"ga",
        "regions":get_regions(plans, "micro"),
        "attributes":{
          "Postgres Extensions":false,
          "RAM":"1GB Memory",
          "Direct SQL Access":true,
          "Row Limit":10000000,
          "Storage Capacity":"512MB",
          "Data Clips":false,
          "Connection Limit":20,
          "High Availability":false,
          "Rollback":"",
          "Encryption At Rest":false,
          "High speed SSD I/O":false,
          "Burstable Performance":false,
          "Dedicated":false
        }
      },
      {
        "size":"standard-0",
        "description":"4GB space, 2GB memory, 1x CPU",
        "state":"ga",
        "regions":get_regions(plans, "micro"),
        "attributes":{
          "Postgres Extensions":false,
          "RAM":"2GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"4GB",
          "Data Clips":true,
          "Connection Limit":120,
          "High Availability":false,
          "Rollback":"1 Day",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":true,
          "Dedicated":false
        }
      },
      {
        "size":"standard-1",
        "description":"16GB space, 2GB memory, 2x CPU, High Availability",
        "state":"ga",
        "regions":get_regions(plans, "micro"),
        "attributes":{
          "Postgres Extensions":"Upon request",
          "RAM":"2GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"16GB",
          "Data Clips":false,
          "Connection Limit":120,
          "High Availability":true,
          "Rollback":"2 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":true,
          "Dedicated":false
        }
      },
      {
        "size":"standard-2",
        "description":"32GB space, 4GB memory, 4x CPU, High Availability",
        "state":"ga",
        "regions":get_regions(plans, "micro"),
        "attributes":{
          "Postgres Extensions":"Upon request",
          "RAM":"4GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"32GB space",
          "Data Clips":true,
          "Connection Limit":480,
          "High Availability":true,
          "Rollback":"4 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":true,
          "Dedicated":false
        }
      },
      {
        "size":"premium-0",
        "description":"20GB space, 4GB memory, 2x CPU, Dedicated",
        "state":"ga",
        "regions":get_regions(plans, "small"),
        "attributes":{
          "Postgres Extensions":true,
          "RAM":"4GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"20GB",
          "Data Clips":true,
          "Connection Limit":120,
          "High Availability":false,
          "Rollback":"1 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":false,
          "Dedicated":true
        }
      },
      {
        "size":"premium-1",
        "description":"50GB space, 8GB memory, 2x CPU, Edicated",
        "state":"ga",
        "regions":get_regions(plans, "medium"),
        "attributes":{
          "Postgres Extensions":true,
          "RAM":"8GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"50GB",
          "Data Clips":true,
          "Connection Limit":120,
          "High Availability":false,
          "Rollback":"1 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":false,
          "Dedicated":true
        }
      },
      {
        "size":"premium-2",
        "description":"100GB space, 16GB memory, 4x CPU, Dedicated, High Availability",
        "state":"ga",
        "regions":get_regions(plans, "large"),
        "attributes":{
          "Postgres Extensions":true,
          "RAM":"16GB Memory",
          "Direct SQL Access":true,
          "Row Limit":null,
          "Storage Capacity":"100GB",
          "Data Clips":true,
          "Connection Limit":500,
          "High Availability":true,
          "Rollback":"4 Days",
          "Encryption At Rest":true,
          "High speed SSD I/O":true,
          "Burstable Performance":false,
          "Dedicated":true
        }
      },
    ]
  },
  function transform_from_appkit_plan(size) {
    if(size === 'small') {
      return 'small'
    } else if(size === 'medium') {
      return 'medium'
    } else if(size === 'large') {
      return 'large'
    } else if(size === 'premium-0') {
      return 'small'
    } else if (size === 'premium-1') {
      return 'medium'
    } else if (size === 'premium-2') {
      return 'large'
    } else {
      return 'micro'
    }
  });
