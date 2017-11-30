"use strict"

const fs = require('fs');
const addon_services = require ('./addon-services.js');
const httph = require('./http_helper.js');
const lifecycle = require('./lifecycle.js');
const common = require('./common.js');
const query = require('./query.js');

function transform_to_response(addon, plan, attachment) {
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

const select_service_attachments = query.bind(query, fs.readFileSync('./sql/select_service_attachments.sql').toString('utf8'), (r) => { return r; });
const select_all_service_attachments = query.bind(query, fs.readFileSync('./sql/select_all_service_attachments.sql').toString('utf8'), (r) => { return r; });
async function list_all(pg_pool, req, res, regex) {
  let attachments = await select_all_service_attachments(pg_pool, []);
  attachments = attachments.map((attachment) => {
    let addon = addon_services.addon_by_id_or_name(attachment.addon);
    let plan = addon_services.plan_by_id_or_name(attachment.plan);
    return transform_to_response(addon, plan, attachment);
  });
  httph.ok_response(res, JSON.stringify(attachments));
}

async function list_by_addon(pg_pool, req, res, regex) {
  let addon_id = httph.first_match(req.url, regex);
  let attachments = await select_service_attachments(pg_pool, [addon_id]);
  attachments = attachments.map((attachment) => {
    let addon = addon_services.addon_by_id_or_name(attachment.addon);
    let plan = addon_services.plan_by_id_or_name(attachment.plan);
    return transform_to_response(addon, plan, attachment);
  });
  httph.ok_response(res, JSON.stringify(attachments));
}

async function list_by_app(pg_pool, app_uuid) {
  let attachments = await select_service_attachments(pg_pool, [app_uuid]);
  return attachments.map((attachment) => {
    let addon = addon_services.addon_by_id_or_name(attachment.addon);
    let plan = addon_services.plan_by_id_or_name(attachment.plan);
    return transform_to_response(addon, plan, attachment);
  });
}

async function http_list_by_app(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  httph.ok_response(res, JSON.stringify(await list_by_app(pg_pool, app.app_uuid)));
}

const select_service_attachment = query.bind(query, fs.readFileSync('./sql/select_service_attachment.sql').toString('utf8'), (r) => { return r; });
async function get(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let addon_attachment_id = httph.second_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let attachments = await select_service_attachment(pg_pool, [app.app_uuid, addon_attachment_id]);
  attachments = attachments.map((attachment) => {
    let addon = addon_services.addon_by_id_or_name(attachment.addon);
    let plan = addon_services.plan_by_id_or_name(attachment.plan);
    return transform_to_response(addon, plan, attachment);
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

async function get_by_id(pg_pool, req, res, regex) {
  let addon_attachment_id = httph.first_match(req.url, regex);
  let attachments = (await select_service_attachment(pg_pool, [addon_attachment_id, null]))
  attachments = attachments.map((attachment) => {
    let addon = addon_services.addon_by_id_or_name(attachment.addon);
    let plan = addon_services.plan_by_id_or_name(attachment.plan);
    return transform_to_response(addon, plan, attachment);
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

async function delete_by_id(pg_pool, req, res, regex) {
  let addon_attachment_id = httph.first_match(req.url, regex);
  let attachments = await select_service_attachment(pg_pool, [addon_attachment_id, null]);
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments ${addon_attachment_id} could not be found.`);
  }
  if(attachments.length !== 1) {
    console.warn("Warning:", 'Cannot pull attachment for ', addon_attachment_id, ' multiple entries were found.');
    throw new common.UnprocessibleEntityError("The specified attachment referred to multiple entries.")
  }
  let addon = addon_services.addon_by_id_or_name(attachments[0].addon);
  let plan = addon_services.plan_by_id_or_name(attachments[0].plan);
  let target_app = {id:attachments[0].app, app:attachments[0].app, name:attachments[0].app_name, space:attachments[0].space, org:attachments[0].org};
  let service_attachment = await addon.detach(pg_pool, target_app, plan, {created:new Date(), updated:new Date(), service:attachments[0].service, foreign_key:attachments[0].foreign_key, config_vars:{}})
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
        transform_to_response(addon, plan, service_attachment)
      ]
    }));
    lifecycle.restart_and_redeploy_app(pg_pool, attachments[0].app, attachments[0].app_name, attachments[0].space, attachments[0].org, 'Detached ' + service_attachment.name).catch((err) => { /* do nothing */ });
  }, 10)
  return httph.ok_response(res, JSON.stringify(transform_to_response(addon, plan, service_attachment)))
}

const select_service_attachment_owner = query.bind(query, fs.readFileSync('./sql/select_service_attachment_owner.sql').toString('utf8'), (r) => { return r; });
async function create(pg_pool, app_uuid, app_name, space_name, space_tags, org, addon) {
  // payload.addon is a "service" not a "service_attachment", we need to pull the service owner information.
  let attachments = await select_service_attachment_owner(pg_pool, [addon]);  
  if(attachments.length === 0) {
    throw new common.NotFoundError(`The specified addon attachments could not be found.`);
  }
  await addon_services.service_exists(pg_pool, attachments[0].service, attachments[0].app);

  if(attachments[0].app === app_uuid) {
    throw new common.ConflictError('Addons cannot be attached to same app they exist on.')
  }
  // check to ensure region of owner and target app match
  let owner_region = await common.alamo.region_name_by_space(pg_pool, attachments[0].space)
  let target_region = await common.alamo.region_name_by_space(pg_pool, space_name)
  if(owner_region !== target_region) {
    throw new common.ConflictError('Addons can only be attached to applications in the same region.')
  }

  try {
    let target_app = {id:app_uuid, app:app_uuid, name:app_name, space:space_name, org};
    let addon_definition = addon_services.addon_by_id_or_name(attachments[0].addon);
    let plan = addon_services.plan_by_id_or_name(attachments[0].plan);
    let service_attachment = await addon_definition.attach(pg_pool, target_app, plan, {created:new Date(), updated:new Date(), service:attachments[0].service, foreign_key:attachments[0].foreign_key, config_vars:{}}, false)
    service_attachment.owner_app = attachments[0].app;
    service_attachment.owner_app_name = attachments[0].app_name;
    service_attachment.owner_owner_space = attachments[0].space;
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
          transform_to_response(addon, plan, service_attachment)
        ]
      }));
      lifecycle.restart_and_redeploy_app(pg_pool, app_uuid, app_name, space_name, org, 'Attached ' + service_attachment.name).catch((err) => { /* do nothing */ });
    }, 10)
    return transform_to_response(addon, plan, service_attachment);
  } catch (e) {
    if(e instanceof common.NoFormationsFoundError) {
      throw new common.UnprocessibleEntityError("Addons cannot be attached until a dyno or formation has been created.")
    } else {
      throw e
    }
  }
}

async function http_create(pg_pool, req, res, regex) {
  let payload = await httph.buffer_json(req)
  let app = await common.app_exists(pg_pool, payload.app)
  return httph.created_response(res, JSON.stringify(await create(pg_pool, app.app_uuid, app.app_name, app.space_name, '', app.org_name, payload.addon)))
}


module.exports = {
  list:list_all,
  list_by_app,
  list_by_addon:list_by_addon,
  get:get,
  get_by_id:get_by_id,
  delete_by_id:delete_by_id,
  create,
  http:{
    list_by_app:http_list_by_app,
    create:http_create
  }
}