const fs = require('fs');
const assert = require('assert');
const query = require('./query.js');
const httph = require('./http_helper.js');
const common = require('./common.js');
const lifecycle = require('./lifecycle.js');
const logs = require('./log-drains.js');

function filter_to_response(payload) {
  const response = {
    created_at: payload.created.toISOString(),
    description: payload.description,
    id: payload.filter,
    options: payload.options,
    name: payload.name,
    type: payload.type,
    organization: {
      id: payload.organization,
    },
    updated_at: payload.updated.toISOString(),
  };
  return response;
}

function filter_attachment_to_response(payload) {
  return {
    created_at: payload.created.toISOString(),
    filter: {
      id: payload.filter,
    },
    app: {
      id: payload.app,
    },
    id: payload.filter_attachment,
    options: payload.attachment_options,
    updated_at: payload.updated.toISOString(),
  };
}

function to_filter_attachment_data(filter, payload) {
  return payload.options || {};
}

function to_filter_data(payload) {
  if (payload.type === 'jwt') {
    assert.ok(payload.options, 'No options was passed in for type jwt.');
    assert.ok(payload.options.jwks_uri, 'The jwks_uri value must be set for this filter.');
    assert.ok(payload.options.issuer, 'The issuer value must be set for this filter.');
    if (payload.options.audiences && !Array.isArray(payload.options.audiences)) {
      payload.options.audiences = payload.options.audiences.toString().split(',');
    }
    return {
      audiences: payload.options.audiences,
      jwks_uri: payload.options.jwks_uri,
      issuer: payload.options.issuer,
    };
  } if (payload.type === 'cors') {
    if (payload.options.allow_origin && !Array.isArray(payload.options.allow_origin)) {
      payload.options.allow_origin = payload.options.allow_origin.toString().split(',');
    }
    if (payload.options.allow_methods && !Array.isArray(payload.options.allow_methods)) {
      payload.options.allow_methods = payload.options.allow_methods.toString().split(',');
    }
    if (payload.options.allow_headers && !Array.isArray(payload.options.allow_headers)) {
      payload.options.allow_headers = payload.options.allow_headers.toString().split(',');
    }
    if (payload.options.expose_headers && !Array.isArray(payload.options.expose_headers)) {
      payload.options.expose_headers = payload.options.expose_headers.toString().split(',');
    }
    assert.ok(!payload.options.allow_methods || payload.options.allow_methods.every((x) => /[A-Za-z0-9:]+/.test(x)),
      'One or more allowed methods has an invalid value. Regular expressions are not allowed.');
    assert.ok(!payload.options.allow_headers || payload.options.allow_headers.every((x) => /[A-Za-z0-9:-]+/.test(x)),
      'One or more allowed headers has an invalid value. Regular expressions are not allowed.');
    assert.ok(!payload.options.expose_headers || payload.options.expose_headers.every((x) => /[A-Za-z0-9:-]+/.test(x)),
      'One or more exposed headers has an invalid value. Regular expressions are not allowed.');
    assert.ok(!payload.options.max_age || (typeof payload.options.max_age === 'number' && payload.options.max_age > 0),
      'The max_age parameter must be a positive number');
    assert.ok(!payload.options.allow_credentials || typeof payload.options.allow_credentials === 'boolean',
      'The allow credentials parameter must be a boolean');

    // https://github.com/istio/istio/blob/48148f5be3c6d84fe1fce8a0491d3c89593145a2/pkg/config/labels/instance.go#L37
    const invalidOrigins = payload.options.allow_origin.filter((origin) => {
      origin = origin.replace(/^http(s)?:\/\//, '');
      return origin === '*' ? false
        : origin.split('.').some((label) => !(/^[a-zA-Z0-9](?:[-a-z-A-Z0-9]*[a-zA-Z0-9])?(?::[0-9]+)?$/.test(label)));
    });
    assert.ok(invalidOrigins.length === 0, `One or more allowed origins is not a valid domain name: "${invalidOrigins.join('", "')}"`);

    if (payload.options.allow_methods) {
      payload.options.allow_methods = payload.options.allow_methods.map((x) => x.toUpperCase());
    }
    return {
      allow_origin: payload.options.allow_origin,
      allow_methods: payload.options.allow_methods,
      allow_headers: payload.options.allow_headers,
      expose_headers: payload.options.expose_headers,
      max_age: payload.options.max_age,
      allow_credentials: payload.options.allow_credentials,
    };
  } else if (payload.type === 'csp') {
    assert.ok(payload.options.policy, 'The specified CSP filter was not included.');
  }
  assert.ok(false, 'The filter type was unrecognized.');
  return null;
}

function attached_apps_response(payload) {
  return {
    name: payload.app_name,
    space: {
      name: payload.space_name,
    },
  };
}

const select_filters = query.bind(query, fs.readFileSync('./sql/select_filters.sql').toString('utf8'), filter_to_response);
const select_filter = query.bind(query, fs.readFileSync('./sql/select_filter.sql').toString('utf8'), filter_to_response);
const select_attached_apps = query.bind(query, fs.readFileSync('./sql/select_attached_apps.sql').toString('utf8'), attached_apps_response);
const delete_filter = query.bind(query, fs.readFileSync('./sql/delete_filter.sql').toString('utf8'), filter_to_response);
const create_filter = query.bind(query, fs.readFileSync('./sql/insert_filter.sql').toString('utf8'), filter_to_response);
const update_filter = query.bind(query, fs.readFileSync('./sql/update_filter.sql').toString('utf8'), filter_to_response);

const select_attachment = query.bind(query, fs.readFileSync('./sql/select_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);
const delete_filter_attachment = query.bind(query, fs.readFileSync('./sql/delete_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);
const insert_filter_attachment = query.bind(query, fs.readFileSync('./sql/insert_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);
const update_filter_attachment = query.bind(query, fs.readFileSync('./sql/update_filter_attachment.sql').toString('utf8'), filter_attachment_to_response);

async function create_attachment(pg_pool, app_uuid, filter_id, options, user) {
  const attachment = await insert_filter_attachment(pg_pool, [app_uuid, filter_id, options, user]);
  const filters = await select_filter(pg_pool, [attachment[0].filter.id]);
  [attachment[0].filter] = filters;
  return attachment[0];
}

async function http_filters_get(pg_pool, req, res, regex) {
  const filter_key = httph.first_match(req.url, regex);
  const filters = await select_filter(pg_pool, [filter_key]);
  if (filters.length === 0) {
    throw new common.NotFoundError('The specified filter was not found.');
  }
  const attached_apps = await select_attached_apps(pg_pool, [filter_key]);
  filters[0].attached_apps = attached_apps;
  return httph.ok_response(res, JSON.stringify(filters[0]));
}

async function http_filters_list(pg_pool, req, res /* regex */) {
  const filters = await select_filters(pg_pool, []);
  return httph.ok_response(res, JSON.stringify(filters));
}

async function http_filters_del(pg_pool, req, res, regex) {
  if (!req.headers['x-username'] || !req.headers['x-elevated-access']) {
    throw new common.UnauthorizedError('Removing filters requires elevated access privileges.');
  }
  const filter_key = httph.first_match(req.url, regex);
  const filters = await select_filter(pg_pool, [filter_key]);
  if (filters.length !== 1) {
    throw new common.NotFoundError(`The specified filter was not found (${filter_key}).`);
  }
  await delete_filter(pg_pool, [filters[0].id]);
  return httph.no_content_response(res, JSON.stringify(filters));
}

async function http_filters_create(pg_pool, req, res /* regex */) {
  const payload = await httph.buffer_json(req);
  let options = {};
  try {
    assert.ok(payload.name, 'The filters name was not provided.');
    assert.ok(payload.description, 'The filters description was not provided.');
    assert.ok(payload.type && (payload.type === 'jwt' || payload.type === 'cors' || payload.type === 'csp'),
      'The filters type was not provided or was an invalid value.');
    assert.ok(payload.organization, 'The organization was not provided.');
    if (payload.organization.id) {
      payload.organization = payload.organization.id;
    } else {
      const org = await common.org_exists(pg_pool, payload.organization);
      payload.organization = org.org;
    }
    options = to_filter_data(payload);
  } catch (e) {
    throw new common.BadRequestError(e.message);
  }
  let filters = await select_filter(pg_pool, [payload.name]);
  if (filters.length > 0) {
    throw new common.ConflictError('A filter by this name already exists.');
  }
  filters = await create_filter(pg_pool, [
    payload.name,
    payload.type,
    payload.description,
    options,
    payload.organization,
    req.headers['x-username'] || 'Unknown',
  ]);
  filters = await select_filter(pg_pool, [filters[0].id]);
  return httph.created_response(res, JSON.stringify(filters[0]));
}

async function http_filters_update(pg_pool, req, res, regex) {
  if (!req.headers['x-username'] || !req.headers['x-elevated-access']) {
    throw new common.UnauthorizedError('Updating filters requires elevated access privileges.');
  }
  const payload = await httph.buffer_json(req);
  const filter_key = httph.first_match(req.url, regex);
  let filters = await select_filter(pg_pool, [filter_key]);
  let options = {};
  try {
    assert.ok(
      (payload.type && (payload.type === 'jwt' || payload.type === 'cors' || payload.type === 'csp')) || !payload.type,
      'The filters type was not provided or was an invalid value.',
    );
    options = to_filter_data(payload);
  } catch (e) {
    throw new common.BadRequestError(e.message);
  }
  if (filters.length === 1) {
    filters = await update_filter(pg_pool, [filters[0].id, payload.name, payload.type, payload.description, options]);
    return httph.ok_response(res, JSON.stringify(filters[0]));
  }
  throw new common.NotFoundError('The specified filter was not found.');
}

async function http_filter_list_attachments(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const filter_attachments = await common.filter_attachments_exists(pg_pool, app.app_uuid);
  const attachments = filter_attachments.map((filter_attachment) => {
    const { filter } = filter_attachment;
    filter_attachment.filter = filter.filter;
    filter_attachment = filter_attachment_to_response(filter_attachment);
    filter_attachment.filter = filter_to_response(filter);
    return filter_attachment;
  });
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function get_attachment(pg_pool, app_uuid, filter_attachment_id) {
  const attachment = await select_attachment(pg_pool, [app_uuid, filter_attachment_id]);
  if (attachment.length === 0) {
    throw new common.NotFoundError('The specified attachment was not found.');
  }
  const filters = await select_filter(pg_pool, [attachment[0].filter.id]);
  [attachment[0].filter] = filters;
  return attachment[0];
}

async function http_filter_get_attachment(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const filter_attachment_key = httph.second_match(req.url, regex);
  const attachments = await get_attachment(pg_pool, app.app_uuid, filter_attachment_key);
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function delete_attachment(pg_pool, filter_attachment_id) {
  return delete_filter_attachment(pg_pool, [filter_attachment_id]);
}

async function http_filter_delete_attachment(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const filter_attachment_key = httph.second_match(req.url, regex);
  const attachment = await get_attachment(pg_pool, app.app_uuid, filter_attachment_key);
  await delete_attachment(pg_pool, attachment.id);
  const filter_attachments = await common.filter_attachments_exists(pg_pool, app.app_uuid);
  const attachments = filter_attachments.map((filter_attachment) => {
    const { filter } = filter_attachment;
    filter_attachment.filter = filter.filter;
    filter_attachment = filter_attachment_to_response(filter_attachment);
    filter_attachment.filter = filter_to_response(filter);
    return filter_attachment;
  });
  logs.event(pg_pool, app.app_name, app.space_name, `Detached filter ${attachment.id}`);
  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'filter_detachment', JSON.stringify({
      action: 'filter_detachment',
      app: {
        name: app.app_name,
        id: app.app_uuid,
      },
      space: {
        name: app.space_name,
      },
      filter_attachment_id: attachment.id,
    }), req.headers['x-username'] ? req.headers['x-username'] : 'System');
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'HTTP Filter Dettached')
      .catch(() => { /* do nothing */ });
  }, 10);
  return httph.ok_response(res, JSON.stringify(attachments));
}

async function http_filter_create_attachment(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const payload = await httph.buffer_json(req);
  let filter = null;
  let attachment_options = {};
  try {
    assert.ok(payload.options, 'The filter object options was not found.');
    assert.ok(payload.filter, 'The filter object was not found.');
    assert.ok(payload.filter.id, 'The filter id was not found.');
    filter = await select_filter(pg_pool, [payload.filter.id]);
    assert.ok(filter.length === 1, 'The specified filter was not found.');
    [filter] = filter;
    const attachments = await common.filter_attachments_exists(pg_pool, app.app_uuid);
    assert.ok(attachments.filter((attch) => attch.filter.type === filter.type).length === 0,
      `A filter of type ${filter.type} is already attached to this app.`);
    attachment_options = to_filter_attachment_data(filter, payload);
  } catch (e) {
    throw new common.BadRequestError(e.message);
  }

  const attachment = await create_attachment(pg_pool, app.app_uuid, payload.filter.id, attachment_options, req.headers['x-username'] || 'System');
  logs.event(pg_pool, app.app_name, app.space_name, `Attached filter ${payload.filter.id}`);
  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'filter_attachment', JSON.stringify({
      action: 'filter_attachment',
      app: {
        name: app.app_name,
        id: app.app_uuid,
      },
      space: {
        name: app.space_name,
      },
      changes: payload,
      filter_attachment_id: attachment.id,
    }), req.headers['x-username'] ? req.headers['x-username'] : 'System');
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'HTTP Filter Attached')
      .catch((err) => console.error(err));
  }, 10);
  return httph.created_response(res, JSON.stringify(attachment));
}

async function update_attachment(pg_pool, app_uuid, filter_attachment_id, filter_id, options) {
  const attachment = await update_filter_attachment(pg_pool, [filter_attachment_id, app_uuid, options]);
  if (attachment.length === 0) {
    throw new common.NotFoundError('The specified attachment was not found.');
  }
  const filters = await select_filter(pg_pool, [attachment[0].filter.id]);
  [attachment[0].filter] = filters;
  return attachment[0];
}

async function http_filter_update_attachment(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);
  const app = await common.app_exists(pg_pool, app_key);
  const filter_attachment_key = httph.second_match(req.url, regex);
  const attachment = await get_attachment(pg_pool, app.app_uuid, filter_attachment_key);
  const payload = await httph.buffer_json(req);
  let attachment_options = {};
  try {
    assert.ok(payload.filter, 'The filter object was not found.');
    assert.ok(payload.filter.id, 'The filter id was not found.');
    attachment_options = to_filter_attachment_data(attachment.filter, payload);
  } catch (e) {
    throw new common.BadRequestError(e.message);
  }
  logs.event(pg_pool, app.app_name, app.space_name, `Updated filter attachment ${attachment.id}`);
  setTimeout(() => {
    common.notify_hooks(pg_pool, app.app_uuid, 'filter_attachment_update', JSON.stringify({
      action: 'filter_attachment_update',
      app: {
        name: app.app_name,
        id: app.app_uuid,
      },
      space: {
        name: app.space_name,
      },
      changes: payload,
      filter_attachment_id: attachment.id,
    }), req.headers['x-username'] ? req.headers['x-username'] : 'System');
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'HTTP Filters Updated')
      .catch((err) => console.error(err));
  }, 10);
  return httph.ok_response(res,
    JSON.stringify(await update_attachment(pg_pool, app.app_uuid, attachment.id, payload.filter.id, attachment_options)));
}

module.exports = {
  http: {
    get: http_filters_get,
    list: http_filters_list,
    delete: http_filters_del,
    create: http_filters_create,
    update: http_filters_update,
    attach: {
      list: http_filter_list_attachments,
      get: http_filter_get_attachment,
      delete: http_filter_delete_attachment,
      create: http_filter_create_attachment,
      update: http_filter_update_attachment,
    },
  },
  create_attachment,
};
