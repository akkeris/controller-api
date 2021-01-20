const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const common = require('./common');
const httph = require('./http_helper.js');
const query = require('./query.js');

// SQL Queries
const select_recommendation_by_primary_key = query.bind(query, fs.readFileSync('./sql/select_recommendation_by_primary_key.sql').toString('utf8'), null);
const insert_recommendation = query.bind(query, fs.readFileSync('./sql/insert_recommendation.sql').toString('utf8'), null);
const update_recommendation = query.bind(query, fs.readFileSync('./sql/update_recommendation_details.sql').toString('utf8'), null);

async function check_recommendation_exists(pg_pool, app_uuid, service, resource_type) {
  const recommendations = await select_recommendation_by_primary_key(pg_pool, [app_uuid, service, resource_type]);
  if (recommendations.length === 0) {
    throw new httph.NotFoundError(`No recommendation was found for ${service} and ${resource_type} on app ${app_uuid}.`);
  }
  return recommendations[0];
}

// Stub for fetching recommendations
// async function get() {}

// Stub for listing recommendations
// async function list() {}

function check_payload(payload) {
  assert.ok(payload.service, 'Missing service property - A originating service must be specified when creating a new recommendation');
  assert.ok(payload.resource_type, 'Missing resource_type property - A resource type must be specified when creating a new recommendation');
  assert.ok(payload.details, 'Missing details property - Details must be provided when creating a new recommendation');
  // Check any necessary payload details here
  assert.ok(payload.details.description, 'Missing description - A human readable description must be provided in the details for a new recommendation');
}

/**
 * Create new recommendation, or update existing recommendation if one exists for the given app, service, and resource type
 * @param {*} pg_pool - Database connection pool
 * @param {*} app_key - App identifier
 * @param {*} service - Originating service
 * @param {*} resource_type - Type of resource (e.g. web dyno, addon)
 * @param {*} details - JSON object containing recommendation details (such as a human readable description)
 */
async function create_or_update(pg_pool, app_key, service, resource_type, details) {
  // We only want there to be one cached recommendation per app/service/resource_type so upon
  // create if it already exists then update instead

  // Make sure app exists
  const app = await common.app_exists(pg_pool, app_key);

  let recommendation = null;
  try {
    recommendation = await check_recommendation_exists(pg_pool, app.app_uuid, service, resource_type);
  } catch (err) {
    // Ignore NotFoundError (leave recommendation blank)
    if (!(err instanceof httph.NotFoundError)) {
      throw err;
    }
  }

  if (!recommendation) {
    const id = uuid.v4();
    await insert_recommendation(pg_pool, [id, app.app_uuid, service, resource_type, details]);
  } else {
    await update_recommendation(pg_pool, [recommendation.recommendation_uuid, details]);
  }
}

/**
 * HTTP handler for recommendation creation. This should handle creating OR updating
 * @param {*} pg_pool - Database connection pool
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} regex - URL path regex
 */
async function http_create(pg_pool, req, res, regex) {
  const payload = await httph.buffer_json(req);
  const app_key = httph.first_match(req.url, regex);

  try {
    check_payload(payload);
  } catch (err) {
    throw new common.UnprocessibleEntityError(err.message);
  }

  return httph.created_response(
    res,
    await create_or_update(pg_pool, app_key, payload.service, payload.resource_type, payload.details),
  );
}

/**
 * HTTP handler for recommendation fetching (stub)
 * @param {*} pg_pool - Database connection pool
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} regex - URL path regex
 */
// async function http_get(pg_pool, req, res, regex) {}

/**
 * HTTP handler for recommendation listing (stub)
 * @param {*} pg_pool - Database connection pool
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} regex - URL path regex
 */
// async function http_list(pg_pool, req, res, regex) {}

module.exports = {
  // get,
  // list,
  create: create_or_update,
  http: {
    create: http_create,
    // list: http_list,
    // get: http_get,
  },
};
