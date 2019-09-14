"use strict"

const assert = require('assert')
const config = require('./config.js')
const fs = require('fs');
const httph = require('./http_helper.js');
const lifecycle = require('./lifecycle.js');
const common = require('./common.js');
const query = require('./query.js');
const formation = require('./formations.js')

function transform_attachment(addon, plan, attachment) {
  return {
    "addon": {
      "id": attachment.service,
      "name": addon.name,
      "app": {
        "id": attachment.owner_app,
        "name": attachment.owner_app_name + '-' + attachment.owner_space
      },
      "plan": {
        "id": plan.id,
        "name": plan.name
      }
    },
    "primary":attachment.primary,
    "app": {
      "id": attachment.app,
      "name": attachment.app_name + '-' + attachment.space
    },
    "created_at": attachment.created.toISOString(),
    "id": attachment.service_attachment,
    "name": attachment.name,
    "updated_at": attachment.updated.toISOString(),
    "web_url": ""
  }
}

const select_addons = query.bind(query, fs.readFileSync('./sql/select_services.sql').toString('utf8'), (r) => { return r; });
const select_service_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });
const select_all_service_attachments = query.bind(query, fs.readFileSync('./sql/select_all_service_attachments.sql').toString('utf8'), (r) => { return r; });

async function http_list_all(pg_pool, req, res, regex) {
  let attachments = await select_all_service_attachments(pg_pool, []);
  attachments = attachments.map((attachment) => {
    let addon = common.service_by_id_or_name(attachment.addon);
    let plan = common.plan_by_id_or_name(attachment.plan);
    return transform_attachment(addon, plan, attachment);
  });
  httph.ok_response(res, JSON.stringify(attachments));
}

async function http_list_by_addon(pg_pool, req, res, regex) {
  let addon_id = httph.first_match(req.url, regex);
  let attachments = await select_service_attachments(pg_pool, [addon_id]);
  attachments = attachments.map((attachment) => {
    let addon = common.service_by_id_or_name(attachment.addon);
    let plan = common.plan_by_id_or_name(attachment.plan);
    return transform_attachment(addon, plan, attachment);
  });
  httph.ok_response(res, JSON.stringify(attachments));
}

async function list_by_app(pg_pool, app_uuid) {
  let attachments = await select_service_attachments(pg_pool, [app_uuid]);
  return attachments.map((attachment) => {
    let addon = common.service_by_id_or_name(attachment.addon);
    let plan = common.plan_by_id_or_name(attachment.plan);
    return transform_attachment(addon, plan, attachment);
  });
}

async function http_list_by_app(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  httph.ok_response(res, JSON.stringify(await list_by_app(pg_pool, app.app_uuid)));
}

const select_service_attachment = query.bind(query, fs.readFileSync('./sql/select_service_attachment.sql').toString('utf8'), (r) => { return r; });
async function http_get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_attachment_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let attachments = await select_service_attachment(pg_pool, [app.app_uuid, addon_attachment_id]);
  attachments = attachments.map((attachment) => {
    let addon = common.service_by_id_or_name(attachment.addon);
    let plan = common.plan_by_id_or_name(attachment.plan);
    return transform_attachment(addon, plan, attachment);
  });
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments ${addon_attachment_id} could not be found.`);
  }
  if(attachments.length !== 1) {
    console.warn("Warning:", 'Cannot pull attachment for ', addon_attachment_id, ' multiple entries were found.');
    throw new common.UnprocessibleEntityError("The specified attachment referred to multiple entries.")
  }
  return httph.ok_response(res, JSON.stringify(attachments[0]));
}

async function http_get_by_id(pg_pool, req, res, regex) {
  let addon_attachment_id = httph.first_match(req.url, regex);
  let attachments = (await select_service_attachment(pg_pool, [addon_attachment_id, null]))
  attachments = attachments.map((attachment) => {
    let addon = common.service_by_id_or_name(attachment.addon);
    let plan = common.plan_by_id_or_name(attachment.plan);
    return transform_attachment(addon, plan, attachment);
  });
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments ${addon_attachment_id} could not be found.`);
  }
  if(attachments.length !== 1) {
    console.warn("Warning:", 'Cannot pull attachment for ', addon_attachment_id, ' multiple entries were found.');
    throw new common.UnprocessibleEntityError("The specified attachment referred to multiple entries.")
  }
  return httph.ok_response(res, JSON.stringify(attachments[0]));
}

async function http_update(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_attachment_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let payload = await httph.buffer_json(req)
  let attachments = await select_service_attachment(pg_pool, [app.app_uuid, addon_attachment_id]);
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments ${addon_attachment_id} could not be found.`);
  }
  if(attachments.length !== 1) {
    console.warn("Warning:", 'Cannot pull attachment for ', addon_attachment_id, ' multiple entries were found.');
    throw new common.UnprocessibleEntityError("The specified attachment referred to multiple entries.")
  }
  if(payload.name) {
    if(!(/^[a-zA-Z][A-Za-z0-9_-]+$/).test(payload.name) || payload.name.length > 22) {
      throw new common.UnprocessibleEntityError("This addon's attachment name is invalid or over 22 characters.")
    }
  }
  let app_obj = {id:app.app_uuid, name:app.app_name, space:app.space_name, org:app.org_name};
  let redeploy = false

  if(payload.primary === false && addon.primary === true) {
    throw new common.ConflictError('Unable to demote (make this addon not the primary addon), you must promote another addon to demote this addon.')
  }

  let addon_service = common.service_by_id_or_name(attachments[0].addon);
  let plan = common.plan_by_id_or_name(attachments[0].plan);
  let addon = Object.assign(attachments[0], {addon_service, plan})
  let attachment = transform_attachment(addon_service, plan, attachments[0]);

  if(payload.name && payload.name !== '' && payload.name.toLowerCase() !== attachments[0].name.toLowerCase()) {
    await addon_service.remap(pg_pool, app_obj, addon, payload.name)
    addon.name = payload.name
    redeploy = true
  }
  if(payload.primary === true && addon.primary === false) {
    await addon_service.promote(pg_pool, app_obj, Object.assign(plan, {"primary":addon.primary}), addon)
    redeploy = true
  }

  if(redeploy) {
    setTimeout(() => {
      common.notify_hooks(pg_pool, app.app_uuid, 'addon_change', JSON.stringify({
        'action':'addon_change',
        'app':{
          'name':app.app_name,
          'id':app.app_uuid
        },
        'space':{
          'name':app.space_name
        },
        'change':'promote',
        'changes':[
          attachment
        ]
      }), req.headers['x-username'] ? req.headers['x-username'] : "System");
      lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Updated ' + attachment.name).catch((err) => { /* do nothing */ });
    }, 10)
  }
  return httph.ok_response(res, JSON.stringify(attachment));
}

async function http_delete(pg_pool, req, res, regex) {
  let addon_attachment_id = httph.first_match(req.url, regex);
  let attachments = await select_service_attachment(pg_pool, [addon_attachment_id, null]);
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments ${addon_attachment_id} could not be found.`);
  }
  if(attachments.length !== 1) {
    console.warn("Warning:", 'Cannot pull attachment for ', addon_attachment_id, ' multiple entries were found.');
    throw new common.UnprocessibleEntityError("The specified attachment referred to multiple entries.")
  }
  let addon_service = common.service_by_id_or_name(attachments[0].addon);
  let plan = common.plan_by_id_or_name(attachments[0].plan);
  let target_app = {id:attachments[0].app, app:attachments[0].app, name:attachments[0].app_name, space:attachments[0].space, org:attachments[0].org};
  let addon = Object.assign(attachments[0], {addon_service, plan})
  let service_attachment = await addon_service.detach(pg_pool, target_app, Object.assign(plan, {"primary":attachments[0].primary}), addon)
  setTimeout(() => {
    common.notify_hooks(pg_pool, attachments[0].app, 'addon_change', JSON.stringify({
      'action':'addon_change',
      'app':{
        'name':attachments[0].app_name,
        'id':attachments[0].app
      },
      'space':{
        'name':attachments[0].space
      },
      'change':'detach',
      'changes':[
        transform_attachment(addon, plan, service_attachment)
      ]
    }), req.headers['x-username']);
    lifecycle.restart_and_redeploy_app(pg_pool, attachments[0].app, attachments[0].app_name, attachments[0].space, attachments[0].org, 'Detached ' + service_attachment.name).catch((err) => { /* do nothing */ });
  }, 10)
  return httph.ok_response(res, JSON.stringify(transform_attachment(addon, plan, service_attachment)))
}

const select_service_attachment_owner = query.bind(query, fs.readFileSync('./sql/select_service_attachment_owner.sql').toString('utf8'), (r) => { return r; });
async function create(pg_pool, app_uuid, app_name, space_name, space_tags, org, addon, user, addon_attachment_name) {
  // payload.addon is a "service" not a "service_attachment", we need to pull the service owner information.
  let attachments = await select_service_attachment_owner(pg_pool, [addon]);  
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments could not be found.`);
  }

  await common.addon_exists(pg_pool, attachments[0].service, attachments[0].app);

  if(attachments[0].app === app_uuid) {
    throw new common.ConflictError('Addons cannot be attached to same app they exist on.')
  }

  if(addon_attachment_name) {
    if(!(/^[a-zA-Z][A-Za-z0-9_-]+$/).test(addon_attachment_name) || addon_attachment_name.length > 22) {
      throw new common.UnprocessibleEntityError("This addon's attachment name is invalid or over 22 characters.")
    }
  }

  let addon_service = common.service_by_id_or_name(attachments[0].addon);
  let source_app = await common.app_exists(pg_pool, attachments[0].app)
  let target_app = await common.app_exists(pg_pool, app_uuid)

  if (source_app.space_tags.split(',').includes('compliance=socs') && !target_app.space_tags.split(',').includes('compliance=socs')) {
    throw new common.ConflictError('Addons from a socs controlled space cannot be attached to a non-socs controlled space.')
  }

  if (source_app.space_tags.split(',').includes('compliance=prod') && !target_app.space_tags.split(',').includes('compliance=prod')) {
    throw new common.ConflictError('Addons from a prod space cannot be attached to a non-prod controlled space.')
  }

  // check to ensure region of owner and target app match
  let owner_region = await common.alamo.region_name_by_space(pg_pool, attachments[0].space)
  let target_region = await common.alamo.region_name_by_space(pg_pool, space_name)
  if(owner_region !== target_region) {
    throw new common.ConflictError('Addons can only be attached to applications in the same region.')
  }

  let proposed_service = addon_service.info()
  if(proposed_service.supports_sharing === false)
  {
    throw new common.ConflictError("This addon service does not support sharing.")
  }

  let plan = common.plan_by_id_or_name(attachments[0].plan);
  let existing_addons = (await select_addons(pg_pool, [app_uuid])).concat(await select_service_attachments(pg_pool, [app_uuid]))
  let existing_installation = existing_addons.filter((s) => { return plan.addon_service.id === s.addon }).length > 0
  if(proposed_service.supports_multiple_installations === false && existing_installation)
  {
    throw new common.ConflictError("This type of addon is already attached to this application and cannot be used twice.")
  }
  
  target_app.space = target_app.space_name;
  target_app.name = target_app.app_name;
  target_app.app = target_app.app_uuid;
  target_app.id = target_app.app_uuid;
  let addon_plan = Object.assign(plan, {"primary":!existing_installation});
  let service = {created:new Date(), updated:new Date(), service:attachments[0].service, foreign_key:attachments[0].foreign_key, config_vars:{}};
  let service_attachment = null
  try {
    service_attachment = await addon_service.attach(pg_pool, target_app, addon_plan, service, false, addon_attachment_name)
  } catch (e) {
    if(e instanceof common.NoFormationsFoundError) {
       // create a web formation if non exists.
      await formation.create(pg_pool, app_uuid, app_name, space_name, space_tags, org, 'web', config.dyno_default_size, 1, null, config.default_port, null, false);
      service_attachment = await addon_service.attach(pg_pool, target_app, addon_plan, service, false, addon_attachment_name)
    } else {
      throw e
    }
  }
  assert.ok(service_attachment, 'The service attachment was null after attachment.')
  service_attachment.owner_app = attachments[0].app;
  service_attachment.owner_app_name = attachments[0].app_name;
  service_attachment.owner_space = attachments[0].space;
  setTimeout(() => {
    common.notify_hooks(pg_pool, app_uuid, 'addon_change', JSON.stringify({
      'action':'addon_change',
      'app':{
        'name':app_name,
        'id':app_uuid
      },
      'space':{
        'name':space_name
      },
      'change':'attach',
      'changes':[
        transform_attachment(addon, plan, service_attachment)
      ]
    }), user ? user : "System");
    lifecycle.restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org, 'Attached ' + service_attachment.name).catch((err) => { /* do nothing */ });
  }, 10)
  return transform_attachment(addon, plan, service_attachment); 
}

async function http_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let app = await common.app_exists(pg_pool, payload.app)
  return httph.created_response(res, JSON.stringify(await create(pg_pool, app.app_uuid, app.app_name, app.space_name, '', app.org_name, payload.addon, req.headers['x-username'], payload.name)))
}


module.exports = {
  list_by_app,
  create,
  http:{
    list_all:http_list_all,
    list_by_addon:http_list_by_addon,
    get_by_id:http_get_by_id,
    get:http_get,
    update:http_update,
    delete:http_delete,
    list_by_app:http_list_by_app,
    create:http_create
  }
}