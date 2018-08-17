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
  'Alamo OnPrem Postgres',
  'postgresqlonprem',
  'alamo-postgresqlonprem',
  'postgresonprem',
  {
    'shared':0,
  },
  'Dedicated and scalable PostgreSQL relational SQL database on premise.',
  {
    'backups':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgresonprem.backups.list(pg_pool, app.space, app.name, service_id)
      }
    },
    'backups-capture':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url, payload) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgresonprem.backups.capture(pg_pool, app.space, app.name, service_id)
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
        return await common.alamo.postgresonprem.backups.restore(pg_pool, app.space, app.name, service_id, action_id, req_url, payload.backup)
      }
    },
    'credentials':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgresonprem.credentials.list(pg_pool, app.space, app.name, service_id)
      }
    },
    'credentials-create':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        console.log("creating:", app.space, app.name, service_id)
        return await common.alamo.postgresonprem.credentials.create(pg_pool, app.space, app.name, service_id)
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
        return await common.alamo.postgresonprem.credentials.destroy(pg_pool, app.space, app.name, service_id, action_id, req_url, payload.role)
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
        return await common.alamo.postgresonprem.credentials.rotate(pg_pool, app.space, app.name, service_id, action_id, req_url, payload.role)
      }
    },
    'logs':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgresonprem.logs(pg_pool, app.space, app.name, service_id)
      }
    },
    'restart':{
      exec:async function(pg_pool, plan, service, app, action_id, req_url) {
        let service_id = service.foreign_key.split(':')[1]
        if(!service_id || service_id === '') {
          throw new common.InternalServerError("No service foriegn key found for this postgres instance.")
        }
        return await common.alamo.postgresonprem.restart(pg_pool, app.space, app.name, service_id)
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
        "size":"shared",
        "description":"512MB space, 1GB memory, 1x CPU",
        "state":"ga",
        "regions":[],
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
      }
    ]
  },
  function transform_from_appkit_plan(size) {
      return 'shared'
  });
