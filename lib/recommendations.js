const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const common = require('./common');
const httph = require('./http_helper.js');
const query = require('./query.js');

// SQL Queries
const select_recommendation_by_primary_key = query.bind(query, fs.readFileSync('./sql/select_recommendation_by_primary_key.sql').toString('utf8'), null);
const select_recommendation_by_id = query.bind(query, fs.readFileSync('./sql/select_recommendation_by_id.sql').toString('utf8'), null);
const insert_recommendation = query.bind(query, fs.readFileSync('./sql/insert_recommendation.sql').toString('utf8'), null);
const update_recommendation = query.bind(query, fs.readFileSync('./sql/update_recommendation_details.sql').toString('utf8'), null);
const select_recommendation_resource_types = query.bind(query, fs.readFileSync('./sql/select_recommendation_resource_types.sql').toString('utf8'), null);
const select_recommendation_resource_type = query.bind(query, fs.readFileSync('./sql/select_recommendation_resource_type.sql').toString('utf8'), null);
const select_recommendations_by_app = query.bind(query, fs.readFileSync('./sql/select_recommendations_by_app.sql').toString('utf8'), null);
const delete_recommendation_by_id = query.bind(query, fs.readFileSync('./sql/delete_recommendation_by_id.sql').toString('utf8'), null);

/**
 * Returns an array of available resource types for recommendations
 */
async function get_resource_types(pg_pool) {
  return select_recommendation_resource_types(pg_pool, []);
}

async function check_resource_type_exists(pg_pool, resource_type_key) {
  const resource_type = (await select_recommendation_resource_type(pg_pool, [resource_type_key]));
  if (resource_type.length === 0) {
    throw new httph.NotFoundError(`No recommendation type was found with key "${resource_type_key}"`);
  }
  return resource_type[0];
}

/**
 * Returns a recommendation for a given app, service, resource type, and action
 */
async function check_recommendation_exists(pg_pool, app_uuid, service, resource_type, action) {
  const recommendations = await select_recommendation_by_primary_key(pg_pool, [app_uuid, service, resource_type, action]);
  if (recommendations.length === 0) {
    throw new httph.NotFoundError(`No recommendation was found for ${service} with action ${action} on app ${app_uuid} and resource type ${resource_type}.`);
  }
  return recommendations[0];
}

// Stub for fetching specific recommendation
async function get_recommendation(pg_pool, recommendation_uuid, app_uuid, service, resource_type, action) {
  if (recommendation_uuid) {
    const recommendations = await select_recommendation_by_id(pg_pool, [recommendation_uuid]);
    if (recommendations.length === 0) {
      throw new httph.NotFoundError(`No recommendation was found for id ${recommendation_uuid}.`);
    }
    return recommendations[0];
  }

  // fetch recommendation based on app uuid, service, resource_type, and action
  return check_recommendation_exists(pg_pool, app_uuid, service, resource_type, action);
}

/**
 * List all recommendations for a given app
 */
async function list_recommendations(pg_pool, app_uuid) {
  return select_recommendations_by_app(pg_pool, [app_uuid]);
}

/**
 * Check the payload for an incoming recommendation. Payload should be supplied with resource_type set to
 * the object, not just the key
 */
async function check_payload(pg_pool, payload) {
  assert.ok(payload.service, 'Missing service property - A originating service must be specified when creating a new recommendation');
  assert.ok(payload.action, 'Missing action property - An action must be specified when creating a new recommendation');
  assert.ok(payload.details, 'Missing details property - Details must be provided when creating a new recommendation');
  assert.ok(payload.resource_type.actions.split(',').some((x) => x === payload.action),
    'Invalid action - Specified action is not valid for the given resource type.');
  // Check details object, make sure the fields are valid for the given resource type
  const valid_action_fields = payload.resource_type.details.action_fields[payload.action];
  const supplied_fields = Object.keys(payload.details);
  // Make sure each action field is present in the payload
  valid_action_fields.forEach((valid_field) => {
    assert.ok(supplied_fields.find((payload_field) => valid_field === payload_field), `The required field ${valid_field} was not supplied in the details payload.`);
  });
  // Make sure there are no extra fields present in the payload
  supplied_fields.forEach((payload_field) => {
    assert.ok(valid_action_fields.find((valid_field) => valid_field === payload_field), `The details field ${payload_field} was not a valid field for the ${payload.resource_type.name} resource type.`);
  });
}

/**
 * Create new recommendation, or update existing recommendation if one exists for the given app, service, and resource type
 * @param {*} pg_pool - Database connection pool
 * @param {*} app_key - App identifier
 * @param {*} service - Originating service
 * @param {*} resource_type - Type of resource (e.g. formation) - should be UUID
 * @param {*} details - JSON object containing recommendation details (such as a human readable description)
 */
async function create_or_update(pg_pool, app_uuid, service, resource_type, action, details) {
  // We only want there to be one cached recommendation per app/service/resource_type/action so upon
  // create if it already exists then update instead

  let recommendation = null;
  try {
    recommendation = await check_recommendation_exists(pg_pool, app_uuid, service, resource_type, action);
  } catch (err) {
    // Ignore NotFoundError, this means we need to create instead of update
    if (!(err instanceof httph.NotFoundError)) {
      throw err;
    }
  }

  if (!recommendation) {
    return insert_recommendation(pg_pool, [uuid.v4(), app_uuid, service, resource_type, action, details]);
  }

  return update_recommendation(pg_pool, [recommendation.recommendation_uuid, details]);
}

/**
 * Delete a recommendation by ID
 * @param {*} pg_pool - Database connection pool
 * @param {*} recommendation_uuid - UUID of recommendation to be deleted
 */
async function delete_recommendation(pg_pool, recommendation_uuid) {
  const recommendation = await delete_recommendation_by_id(pg_pool, [recommendation_uuid]);
  return recommendation;
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

  // Make sure app exists
  const app = await common.app_exists(pg_pool, app_key);

  try {
    assert.ok(payload.resource_type, 'Missing resource_type property - A resource type must be specified when creating a new recommendation');
    const type = await check_resource_type_exists(pg_pool, payload.resource_type);
    payload.resource_type = type;
    await check_payload(pg_pool, payload);
  } catch (err) {
    throw new common.UnprocessibleEntityError(err.message);
  }

  const result = (await create_or_update(
    pg_pool,
    app.app_uuid,
    payload.service,
    payload.resource_type.resource_type_uuid,
    payload.action,
    payload.details,
  ))[0];

  return httph.created_response(
    res,
    JSON.stringify({
      id: result.recommendation,
      app: {
        name: app.app_name,
        key: `${app.app_name}-${app.space_name}`,
        id: app.app_uuid,
      },
      service: result.service,
      resource_type: payload.resource_type.name,
      action: result.action,
      details: result.details,
    }),
  );
}

/**
 * Make a recommendation a bit more human-readable
 */
function format_recommendation_response(app, resource_types, recommendation) {
  const type = resource_types.find((x) => x.resource_type_uuid === recommendation.resource_type);
  recommendation.app = { id: app.app_uuid, key: `${app.app_name}-${app.space_name}` };
  recommendation.resource_type = { id: type.resource_type_uuid, name: type.name };
  recommendation.id = recommendation.recommendation_uuid;
  delete recommendation.recommendation_uuid;
  return recommendation;
}

/**
 * HTTP handler for fetching a specific recommendation
 * @param {*} pg_pool - Database connection pool
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} regex - URL path regex
 */
async function http_get(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const url = new URL(`${process.env.AKKERIS_APP_CONTROLLER_URL}/${req.url}`);

  const params_length = Array.from(url.searchParams).length;
  if (params_length < 1) {
    throw new httph.BadRequestError('Must provide either recommendation UUID or service, resource_type, action parameters.');
  }

  const resource_types = await get_resource_types(pg_pool);
  let recommendation;

  // Get by specific recommendation UUID
  if (url.searchParams.has('recommendation')) {
    common.check_uuid(url.searchParams.get('recommendation'));
    recommendation = await get_recommendation(pg_pool, url.searchParams.get('recommendation'));
  } else if (url.searchParams.has('service') && url.searchParams.has('resource_type') && url.searchParams.has('action')) {
  // Get by service/resource_type/action combo
    const resource_type = await check_resource_type_exists(pg_pool, url.searchParams.get('resource_type'));
    recommendation = await get_recommendation(
      pg_pool,
      null,
      app.app_uuid,
      url.searchParams.get('service'),
      resource_type.resource_type_uuid,
      url.searchParams.get('action'),
    );
  } else {
    throw new httph.BadRequestError('Must provide either recommendation UUID or service, resource_type, action parameters.');
  }

  return httph.ok_response(res, JSON.stringify(format_recommendation_response(app, resource_types, recommendation)));
}

async function http_delete(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const url = new URL(`${process.env.AKKERIS_APP_CONTROLLER_URL}/${req.url}`);

  const params_length = Array.from(url.searchParams).length;
  if (params_length < 1) {
    throw new httph.BadRequestError('Must provide either recommendation UUID or service, resource_type, action parameters.');
  }

  const resource_types = await get_resource_types(pg_pool);
  let recommendation;

  // Get by specific recommendation UUID
  if (url.searchParams.has('recommendation')) {
    common.check_uuid(url.searchParams.get('recommendation'));
    recommendation = await get_recommendation(pg_pool, url.searchParams.get('recommendation'));
  } else if (url.searchParams.has('service') && url.searchParams.has('resource_type') && url.searchParams.has('action')) {
  // Get by service/resource_type/action combo
    const resource_type = await check_resource_type_exists(pg_pool, url.searchParams.get('resource_type'));
    recommendation = await get_recommendation(
      pg_pool,
      null,
      app.app_uuid,
      url.searchParams.get('service'),
      resource_type.resource_type_uuid,
      url.searchParams.get('action'),
    );
  } else {
    throw new httph.BadRequestError('Must provide either recommendation UUID or service, resource_type, action parameters.');
  }

  recommendation = await delete_recommendation(recommendation.recommendation_uuid);

  const response = {
    recommendation: format_recommendation_response(app, resource_types, recommendation),
    result: 'successful',
  };

  return httph.ok_response(res, JSON.stringify(response));
}

/**
 * HTTP handler for listing recommendations for a given app
 * @param {*} pg_pool - Database connection pool
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} regex - URL path regex
 */
async function http_list(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const resource_types = await get_resource_types(pg_pool);
  const recommendations = await list_recommendations(pg_pool, app.app_uuid);
  return httph.ok_response(res, JSON.stringify(
    recommendations.map((recommendation) => format_recommendation_response(app, resource_types, recommendation)),
  ));
}

/**
 * HTTP handler for getting available recommendation resource types
 * @param {*} pg_pool - Database connection pool
 * @param {*} req - Request object
 * @param {*} res - Response object
 */
async function http_get_resource_types(pg_pool, req, res) {
  return httph.ok_response(res, JSON.stringify(await get_resource_types(pg_pool)));
}

module.exports = {
  get: get_recommendation,
  list: list_recommendations,
  http: {
    create: http_create,
    list: http_list,
    get: http_get,
    get_resource_types: http_get_resource_types,
    delete: http_delete,
  },
  get_resource_types,
};
