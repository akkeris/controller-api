"use strict"

const assert = require('assert')
const fs = require('fs');
const common = require('./common.js');
const config = require('./config.js');
const httph = require('./http_helper.js');
const lifecycle = require('./lifecycle.js');
const logs = require('./log-drains.js');
const uuid = require('uuid');
const query = require('./query.js');
const spaces = require('./spaces.js');

// private
function postgres_to_payload(result) {
  return {
    app: {
      name: result.appname,
      id: result.app
    },
    command: result.command,
    created_at: result.created.toISOString(),
    id: result.formation,
    quantity: result.quantity,
    size: result.size,
    type: result.type,
    port: result.type === 'web' ? result.port : null,
    healthcheck: result.type === 'web' ? result.healthcheck : null,
    updated_at: result.updated
  }
}

// private - this will return a safety value fo 6000 (60 dollars) if 
//           no data is available or the size is not found.
function size_to_price(size) {
  if(!global.dyno_sizes) {
    return 6000;
  }
  return (global.dyno_sizes.filter((x) => { return x.name === size; })[0] || { "price":60 }).price * 100;
}

// private - populates sizes and refreshes them on a half an hour basis.
function begin_timers(pg_pool) {
  let set_dyno_size = () => {
    common.alamo.sizes(pg_pool)
      .then((data) => global.dyno_sizes = data)
      .catch((err) => console.error('Error: unable to get sizes.'))
  };
  setInterval(set_dyno_size, 30 * 60 * 1000);
  set_dyno_size();
}

// private
async function sizes_to_enum(pg_pool, space_name) {
  return (await common.alamo.sizes_by_space(pg_pool, space_name))
    .map((item) => { return item.name });
}

let select_formation = query.bind(query, fs.readFileSync("./sql/select_formation.sql").toString('utf8'), postgres_to_payload)

// private
let insert_formation = query.bind(query, fs.readFileSync("./sql/insert_formation.sql").toString('utf8'), postgres_to_payload);
let insert_formation_changes = query.bind(query, fs.readFileSync("./sql/insert_formation_changes.sql").toString('utf8'), (r) => { return r; });
async function create_dyno(pg_pool, app_uuid, app_name, space_name, type, command, quantity, size, port, healthcheck) {
  let created = new Date()
  let id = uuid.v4()
  let formation_params = [id, app_uuid, created, created, type, command, quantity, port, size, healthcheck, size_to_price(size)]

  let formations = await insert_formation(pg_pool, formation_params)
  let formation_change_params = [id, app_uuid, type, command, quantity, port, size, healthcheck, size_to_price(size)]
  await insert_formation_changes(pg_pool, formation_change_params)
  // we must append the app name, as its not returned by the insert.
  formations[0].app.name = `${app_name}-${space_name}`
  await common.alamo.dyno.create(pg_pool, app_name, space_name, type, port, size, healthcheck)
  return formations[0]
}

// public
let delete_formation = query.bind(query, fs.readFileSync("./sql/delete_formation.sql").toString('utf8'), (x) => { return x; });
async function delete_dyno(pg_pool, app_uuid, app_name, space_name, type) {
  // only do this if we are the last and only app.
  let formation = await delete_formation(pg_pool, [app_uuid, type]);
  let dyno = await common.alamo.dyno.delete(pg_pool, app_name, space_name, type);
  return formation
}

// public
async function delete_dynos(pg_pool, app_uuid, app_name, space_name) {
  let forms = await common.formations_exists(pg_pool, app_uuid);
  let errors = [];
  for(let i=0; i < forms.length; i++) {
    await delete_dyno(pg_pool, app_uuid, app_name, space_name, forms[i].type);
  }
  return forms
}

// private - does not check if incoming values are valid for region/stack/type.
//         - in addition a restart redeploy is required for these changes to take affect.
let update_formation_remove_command = query.bind(query, fs.readFileSync('./sql/update_formation_remove_command.sql').toString('utf8'), (r) => r);
let update_formation_remove_healthcheck = query.bind(query, fs.readFileSync('./sql/update_formation_remove_healthcheck.sql').toString('utf8'), (r) => r);
let update_formation = query.bind(query, fs.readFileSync("./sql/update_formation.sql").toString('utf8'), postgres_to_payload);
let update_formation_changes = query.bind(query, fs.readFileSync("./sql/update_formation_changes.sql").toString('utf8'), (r) => { return r; });
async function update_dyno(pg_pool, app_uuid, app_name, space_name, form) {
  form.type = form.type.toLowerCase().trim()
  let existing_formation = await select_formation(pg_pool, [app_uuid, form.type])
  if(existing_formation.length === 0) {
    throw new common.NoFormationsFoundError()
  }
  let formation_params = [app_uuid, form.type, form.size, form.quantity, form.port, form.command, form.healthcheck, form.size ? size_to_price(form.size) : null];
  let formation = await update_formation(pg_pool, formation_params);
  if (formation.length === 0) {
    // Update failed.
    throw new common.NoFormationsFoundError()
  }
  // Log changes so we can calculate invoicing from deltas
  await update_formation_changes(pg_pool, formation_params);
  // Note: during the deployment we specify the command, there's no need
  // to explicitly inform the backing stack API, during the next restart
  // and redeploy it will pickup the new command.  Only web types may explicitly
  // remove their command.
  if(formation[0].type === 'web' && existing_formation[0].command && form['remove-command']) {
    logs.event(pg_pool, app_name, space_name, "Changing startup command on web to default")
    await update_formation_remove_command(pg_pool, [app_uuid, form.type])
    formation[0].command = null;
  }
  if(form.command && form.command !== existing_formation[0].command) {
    logs.event(pg_pool, app_name, space_name, "Changing startup command on " + formation[0].type + " to " + form.command)
  }
  if(typeof (form.quantity) !== 'undefined' && form.quantity !== null) {
    logs.event(pg_pool, app_name, space_name, "Scaling dynos on " + formation[0].type + " to " + form.quantity)
    await common.alamo.dyno.scale(pg_pool, app_name, space_name, formation[0].type, form.quantity)
  }
  if(form.port && formation[0].type === 'web') {
    logs.event(pg_pool, app_name, space_name, "Changing application port to " + form.port)
    await common.alamo.dyno.change_port(pg_pool, app_name, space_name, form.port)
  }
  if(form.size) {
    logs.event(pg_pool, app_name, space_name, "Changing dyno plan on " + formation[0].type + " to " + formation[0].size)
    await common.alamo.dyno.change_plan(pg_pool, app_name, space_name, formation[0].type, form.size)
  }
  if(form.healthcheck && formation[0].type === 'web') {
    logs.event(pg_pool, app_name, space_name, "Changing application health check to " + form.healthcheck)
    await common.alamo.dyno.change_healthcheck(pg_pool, app_name, space_name, formation[0].type, form.healthcheck)
  } else if (form.removeHealthcheck && formation[0].type === 'web') {
    logs.event(pg_pool, app_name, space_name, "Removing application health check")
    await update_formation_remove_healthcheck(pg_pool, [app_uuid, form.type])
    await common.alamo.dyno.remove_healthcheck(pg_pool, app_name, space_name, formation[0].type)
  }
  return formation[0];
}

// public
function formation_payload_check(payload, sizes) {
  assert.ok(typeof (payload.size) === 'undefined' || sizes.indexOf(payload.size) !== -1,
    'The payload size was not recognized.');
  assert.ok(typeof (payload.type) === 'undefined' || payload.type && /(^[a-z0-9]+$)/.exec(payload.type) !== null,
    'The type specified was invalid, it cannot contain spaces or special characters (lower case alpha numeric only)');
  assert.ok(typeof (payload.quantity) === 'undefined' || Number.isInteger(payload.quantity) && payload.quantity > -1 && payload.quantity < 33,
    'The number of instances must be between 0 and 32.');
  assert.ok(typeof (payload.port) === 'undefined' || payload.port === null || (payload.port && Number.isInteger(payload.port) && payload.port > 1023 && payload.port < 65536),
    'The specified port is invalid, it must be a number between 1024 and 65535.');
  assert.ok(payload.type === 'web' || (payload.type !== 'web' && !payload.port),
    'A port was specified for a non-web based application, the port should not be set.');
  assert.ok(payload.type === 'web' || (payload.type !== 'web' && !payload.healthcheck),
    'A healthcheck was specified for a non-web based application, the path should not be set.');
  assert.ok(payload.type === 'web' || (payload.type !== 'web' && !payload.removeHealthcheck),
    'Cannot remove healthcheck on non web based dyno.');
}

// public
async function create(pg_pool, app_uuid, app_name, space_name, space_tags, org_name, type, size, quantity, command, port, healthcheck, remove_health_check, user = "System") {
  assert.ok(app_uuid, 'The app uuid was not passed into create formations.')
  assert.ok(type, 'The type was not passed in to formations create.')
  assert.ok(space_name, 'The space_name was not passed in to formations create.')
  assert.ok(space_tags || space_tags === "", 'The space_tags was not passed in to formations create.')
  type = type.toLowerCase().trim()
  if(app_name.indexOf('-') > -1) {
    throw new common.UnprocessibleEntityError(`Invalid app name: ${app_name}`);
  }
  let size_names = await sizes_to_enum(pg_pool, space_name);
  let payload = null;
  try {
    // We only assign defaults here on create, not on any updates (patches)
    // change to enum
    size = size || config.dyno_default_size;
    size = (space_tags.indexOf('compliance=prod') > -1) ? size + "-prod" : size;
    quantity = quantity || 1;
    command = command || null;
    healthcheck = healthcheck || null;
    port = (type === 'web' && (typeof(port) === 'undefined' || port === null)) ? config.default_port : port;
    payload = {type, command, quantity, port, size, healthcheck, removeHealthcheck:remove_health_check};
    formation_payload_check(payload, size_names);
    assert.ok(type === 'web' || type !== 'web' && command !== '' && command,
      'A run command must be specified for any type outside of a web process.');
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message);
  }

  let forms = await select_formation(pg_pool, [app_uuid, type]);
  if (forms.length !== 0) {
    throw new common.ConflictError(`The process of type ${type} already exists.`);
  }

  // We must have a base web type before we can allow any new types to be created
  // otherwise we cannot have a base reference for sharing configuration.
  if(type !== 'web') {
    if((await select_formation(pg_pool, [app_uuid, "web"])).length === 0) {
       await create_dyno(pg_pool, app_uuid, app_name, space_name, "web", null, 0, config.dyno_default_size, config.default_port, null, user);
    }
  }

  return await create_dyno(pg_pool, app_uuid, app_name, space_name, type, command, quantity, size, port, healthcheck, user);
}


// public
async function http_list(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let formations = await common.formations_exists(pg_pool, app.app_uuid)
  return httph.ok_response(res, JSON.stringify(formations.map(postgres_to_payload)))
}

// public
async function http_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  let payload = await httph.buffer_json(req)
  if(app.disabled) {
    throw new common.ConflictError("An apps formation can be changed or created while its been placed in maintenance mode.")
  }

  let formation = await create(pg_pool, app.app_uuid, app.app_name, app.space_name, space.tags, app.org_name, payload.type, payload.size, payload.quantity, payload.command, payload.port, payload.healthcheck, payload.removeHealthcheck, req.headers['x-username'])
  setTimeout(() => {
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Formation Changed').catch(console.error.bind(console));
    common.notify_hooks(pg_pool, app.app_uuid, 'formation_change', JSON.stringify({
      'action': 'formation_change',
      'app': {
        'name': app.app_name,
        'id': app.app_uuid
      },
      'space': {
        'name': app.space_name
      },
      'change': 'create',
      'changes': [payload]
    }), req ? req.headers['x-username'] : "System");
  }, 10);
  return httph.created_response(res, JSON.stringify(formation))
}

// public
async function http_batch_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  let inbound = await httph.buffer_json(req)
  if(app.disabled) {
    throw new common.ConflictError("An apps formation can be changed or created while its been placed in maintenance mode.")
  }
  let size_names = await sizes_to_enum(pg_pool, app.space_name)
  
  try {
    assert.ok(Array.isArray(inbound), 'The payload was not an array of formation changes.');
    // DO NOT use foreach, we want it to throw, forEach will gobble them.
    for (let i = 0; i < inbound.length; i++) {
      // DO NOT assign defaults, we want to record changes, not complete updates.
      if(space.tags.indexOf('compliance=prod') > -1 && typeof (inbound[i].size) !== 'undefined') {
        inbound[i].size = inbound[i].size + "-prod"
      }
      assert.ok(inbound[i].type, 'The type specified was invalid, it cannot contain spaces or special characters (alpha numeric only)');
      formation_payload_check(inbound[i], size_names);
    }
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let results = await Promise.all(inbound.map(async (form) => update_dyno(pg_pool, app.app_uuid, app.app_name, app.space_name, form)));
  setTimeout(() => {
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Formation Changed').catch(console.error.bind(console))
    common.notify_hooks(pg_pool, app.app_uuid, 'formation_change', JSON.stringify({
      'action': 'formation_change',
      'app': {
        'name': app.app_name,
        'id': app.app_uuid
      },
      'space': {
        'name': app.space_name
      },
      'change': 'update',
      'changes': inbound
    }), req ? req.headers['x-username'] : "System");
  }, 10);
  return httph.ok_response(res, JSON.stringify(results));
}

// public
async function http_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let formation_key = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let space = await common.space_exists(pg_pool, app.space_name)
  if(app.disabled) {
    throw new common.ConflictError("An apps formation can be changed or created while its been placed in maintenance mode.")
  }
  let payload = await httph.buffer_json(req)
  let size_names = await sizes_to_enum(pg_pool, app.space_name)
  
  try {
    // DO NOT assign defaults, we want to record changes, not complete updates.
    if(space.tags.indexOf('compliance=prod') > -1 && typeof (payload.size) !== 'undefined') {
      payload.size = payload.size + "-prod"
    }
    payload.type = formation_key;
    formation_payload_check(payload, size_names)
  } catch (e) {
    throw new common.UnprocessibleEntityError(e.message)
  }
  let form = await update_dyno(pg_pool, app.app_uuid, app.app_name, app.space_name, payload)
  setTimeout(() => {
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Formation Changed').catch(console.error.bind(console))
    common.notify_hooks(pg_pool, app.app_uuid, 'formation_change', JSON.stringify({
      'action': 'formation_change',
      'app': {
        'name': app.app_name,
        'id': app.app_uuid
      },
      'space': {
        'name': app.space_name
      },
      'change': 'update',
      'changes': [payload]
    }), req ? req.headers['x-username'] : "System");
  }, 10);
  return httph.ok_response(res, JSON.stringify(form));
}

// public
async function http_delete(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let formation_key = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  if(app.disabled) {
    throw new common.ConflictError("An apps formation cannot be changed while its been placed in maintenance mode.")
  }
  let formation = await delete_dyno(pg_pool, app.app_uuid, app.app_name, app.space_name, formation_key)
  setTimeout(() => {
    lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Formation Changed').catch(console.error.bind(console))
    common.notify_hooks(pg_pool, app.app_uuid, 'formation_change', JSON.stringify({
      'action': 'formation_change',
      'app': {
        'name': app.app_name,
        'id': app.app_uuid
      },
      'space': {
        'name': app.space_name
      },
      'change': 'delete',
      'changes': [{
        'type': formation.type,
        'port': formation.port,
        'command': formation.command,
        'size': formation.size,
        'quantity': formation.quantity,
        'healthcheck': formation.healthcheck
      }]
    }), req ? req.headers['x-username'] : "System")
  }, 10)
  return httph.ok_response(res, JSON.stringify(formation))
}

// public
async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let formation_key = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let formation = await select_formation(pg_pool, [app.app_uuid, formation_key])
      
  if (formation.length === 0) {
    throw new common.NotFoundError(`The specified formation ${formation_key} was not found.`)
  } else {
    return httph.ok_response(res, JSON.stringify(formation[0]))
  }
}

// public
async function http_size_list(pg_pool, req, res) {
  return httph.ok_response(res, await common.alamo.sizes(pg_pool));
}

module.exports = {
  check:formation_payload_check,
  timers: {"begin":begin_timers},
  create,
  list:common.formations_exists,
  http:{
    sizes:http_size_list,
    get:http_get,
    batch_update:http_batch_update,
    update:http_update,
    create:http_create,
    list:http_list,
    delete:http_delete,
  },
  delete_dynos,
}