"use strict"

const fs = require('fs');
const crypto = require('crypto');
const uuid = require('uuid');
const httph = require('./http_helper.js')
const query = require('./query.js');
const common = require('./common.js');

function to_response(db_row) {
  return {
    "country": db_row.country,
    "created_at": (new Date(db_row.created)).toISOString(),
    "description": db_row.description,
    "id": db_row.region,
    "locale": db_row.locale,
    "name": db_row.name,
    "private_capable": db_row.private_capable,
    "provider": {
      "name": db_row.provider_name,
      "region": db_row.provider_region,
      "availability_zones":db_row.provider_availability_zones.split(',')
    },
    "high_availability":db_row.high_availability,
    "updated_at": (new Date(db_row.updated)).toISOString()
  }
}

const select_regions = query.bind(query, fs.readFileSync('./sql/select_regions.sql').toString('utf8'), to_response);
const insert_region = query.bind(query, fs.readFileSync('./sql/insert_region.sql').toString('utf8'), to_response);
const update_region = query.bind(query, fs.readFileSync('./sql/update_region.sql').toString('utf8'), to_response);
const delete_region = query.bind(query, fs.readFileSync('./sql/delete_region.sql').toString('utf8'), to_response);

async function list(pg_pool) {
  return await select_regions(pg_pool, [])
}

async function update(pg_pool, name, country, description, locale, private_capable, provider_name, provider_region, provider_availability_zones, high_availability, deprecated) {
  try {
    console.assert(!country || country !== '', 'The specified country field does not exist and is required.')
    console.assert(!description || description !== '', 'The description field for this region is required.')
    console.assert(!locale || locale !== '', 'The specified locale must exist.')
    console.assert(!provider_name || provider_name !== '', 'The specified providers name must exist.')
    console.assert(!provider_region || provider_region !== '', 'The specified providers region must exist.')
    console.assert(!provider_availability_zones || Array.isArray(provider_availability_zones), 'The specified providers availability_zones is required.')
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let updated_region = await update_region(pg_pool, [name, country, description, locale, private_capable, provider_name, provider_region, provider_availability_zones ? provider_availability_zones.join(',') : null, high_availability, deprecated])
  if(updated_region.length !== 1) {
    throw new common.InternalServerError('An unexpected error occured updating this regions record.')
  }
  return await updated_region[0]
}

async function create(pg_pool, name, country, description, locale, private_capable, provider_name, provider_region, provider_availability_zones, high_availability) {
  try {
    console.assert(name && name !== '', 'The regions name was not provided and is required.')
    console.assert(/^[A-z0-9\-]+$/.exec(name) !== null && name.length < 32, 'The region name was invalid, it must be an alpha numeric and may contain a hyphen.')
    console.assert(country && country !== '', 'The specified country field does not exist and is required.')
    console.assert(description && description !== '', 'The description field for this region is required.')
    console.assert(locale && locale !== '', 'The specified locale must exist.')
    console.assert(provider_name && provider_name !== '', 'The specified providers name must exist.')
    console.assert(private_capable === false || private_capable === true, 'The specified value for private capable was neither true or false.')
    console.assert(provider_region && provider_region !== '', 'The specified providers region must exist.')
    console.assert(provider_availability_zones, 'The specified providers availability zones is required.')
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let region = await common.region_exists(pg_pool, name, true);
  if(region) {
    throw new common.ConflictError(`Unable to create ${name} region, it already exists.`)
  }
  let params = [uuid.v4(), name, country, description, locale, private_capable, provider_name, provider_region, provider_availability_zones.join(','), high_availability];
  let new_region = await insert_region(pg_pool, params)
  if(new_region.length !== 1) {
    throw new common.InternalServerError('An unexpected error occured creating this regions record.')
  }
  return new_region[0]
}

async function http_update(pg_pool, req, res, exp) {
  if(req.headers['x-username']) {
    throw new common.NotAllowedError('This operation is only allowed by administrators.')
  }
  let region = await common.region_exists(pg_pool, 
    httph.first_match(req.url, exp))
  let payload = await httph.buffer_json(req)
  return httph.ok_response(res, 
    JSON.stringify(await update(pg_pool, payload.name, payload.country, payload.description, payload.locale, payload.private_capable, payload.provider ? payload.provider.name : null, payload.provider ? payload.provider.region : null, payload.provider ? payload.provider.availability_zones : null, payload.high_availability, payload.deprecated)))
}

async function http_create(pg_pool, req, res, exp) {
  if(req.headers['x-username']) {
    throw new common.NotAllowedError('This operation is only allowed by administrators.')
  }
  let payload = await httph.buffer_json(req)
  return httph.created_response(res, 
    JSON.stringify(await create(pg_pool, payload.name, payload.country, payload.description, payload.locale, payload.private_capable, payload.provider.name, payload.provider.region, payload.provider.availability_zones, payload.high_availability)))
}

async function http_delete(pg_pool, req, res, exp) {
  if(req.headers['x-username']) {
    throw new common.NotAllowedError('This operation is only allowed by administrators.')
  }
  let region = await common.region_exists(pg_pool, httph.first_match(req.url, exp))
  let deleted_region = await delete_region(pg_pool, [region.region])
  if(deleted_region.length !== 1) {
    throw new common.InternalServerError('An unexpected error occured deleting this regions record.')
  }
  return httph.ok_response(res, JSON.stringify(deleted_region[0]))
}

async function http_list(pg_pool, req, res, exp) {
  return httph.ok_response(res, JSON.stringify(await list(pg_pool)))
}

async function http_get(pg_pool, req, res, exp) {
  return httph.ok_response(res, 
    JSON.stringify(to_response(await common.region_exists(pg_pool, 
      httph.first_match(req.url, exp)))))
}

module.exports = {
  get:common.region_exists,
  list,
  create,
  update,
  delete:delete_region,
  http:{
    delete:http_delete,
    create:http_create,
    update:http_update,
    list:http_list,
    get:http_get
  }
}