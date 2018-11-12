"use strict"

const crypto = require('crypto');
const fs = require('fs');
const uuid = require('uuid');
const common = require('../common.js');
const config = require('../config.js');
const httph = require('../http_helper.js');
const query = require('../query.js');
const log_drains = require('../log-drains.js')

module.exports = function(drain, name, human_name, description, website) {
  function info(regions) {
    return {
      "actions":[],
      "cli_plugin_name": name,
      "created_at": "2016-08-09T12:00:00Z",
      "human_name": human_name,
      "description": description,
      "image_url": null,
      "id": uuid.unparse(crypto.createHash('sha256').update(name).digest(), 16),
      "name": name,
      "state": "ga",
      "available_regions":regions,
      "supports_upgrading": false,
      "supports_multiple_installations": false,
      "supports_sharing": false,
      "updated_at": "2016-08-09T12:00:00Z"
    };
  }

  function create_service_attachment_name(addon_plan) {
    return name + '-' + common.random_name() + '-' + Math.floor(Math.random() * 10000);
  }

  function get_actions() {
    return [];
  }

  async function action(pg_pool, plan, service, app, action_id, req_url) {
    throw new common.NotAllowedError("The addon does not support any actions.");
  }

  const insert_service = query.bind(query, fs.readFileSync('./sql/insert_service.sql').toString('utf8'), (r) => { return r; });
  const insert_service_attachment = query.bind(query, fs.readFileSync('./sql/insert_service_attachment.sql').toString('utf8'), (r) => { return r; });
  const delete_service = query.bind(query, fs.readFileSync('./sql/delete_service.sql').toString('utf8'), (r) => { return r; });
  const delete_service_attachment = query.bind(query, fs.readFileSync('./sql/delete_service_attachment.sql').toString('utf8'), (r) => { return r; });

  async function provision(pg_pool, app, addon_plan) {
    let data = await log_drains.create(pg_pool, app.id, app.name, app.space, drain);
    let service_uuid = data.id
    let service = {
      foreign_key:name + ":" + data.id,
      config_vars:{}
    };
    let created_updated = new Date();
    let addon = info();
    await insert_service(pg_pool, [service_uuid, addon.id, addon.name, addon_plan.id, addon_plan.name, addon_plan.price.cents, service.foreign_key, created_updated, created_updated]);
    let service_attachment_uuid = uuid.v4();
    let service_attachment_name = create_service_attachment_name(addon, addon_plan);
    await insert_service_attachment(pg_pool, [service_attachment_uuid, service_attachment_name, service_uuid, app.id, true, addon_plan.primary, created_updated, created_updated]);
    service.name = service_attachment_name;
    service.service = service_uuid;
    service.created = created_updated;
    service.updated = created_updated;
    return service;
  }

  async function unprovision(pg_pool, app, addon_plan, service) {
    let data = await log_drains.list(pg_pool, app.id, app.name, app.space);
    data = data.filter((x) => { return x.url === drain});
    if(data.length === 0) {
      console.warn(`Error: The specified log drain addon could not be found. ${drain}`);
    } else {
      await log_drains.delete(pg_pool, app.id, app.name, app.space, data[0].id);
    }
    await delete_service_attachment(pg_pool, [service.service, app.id]);
    await delete_service(pg_pool, [service.service]);
    return service;
  }

  async function attach(pg_pool, target_app, addon_plan, service, owner, cb) {
    throw new common.NotAllowedError("Attaching and dettaching are not supported by this addon.");
  }

  async function detach(pg_pool, app, addon_plan, service) {
    throw new common.NotAllowedError("Attaching and dettaching are not supported by this addon.");
  }

  function plans(regions) {
    return [
      {
        "addon_service": {
          "id": uuid.unparse(crypto.createHash('sha256').update(name).digest(), 16),
          "name": name
        },
        "created_at": "2016-08-09T12:00:00Z",
        "default": false,
        "description": description,
        "human_name": "basic",
        "id": uuid.unparse(crypto.createHash('sha256').update(name + ":basic").digest(), 16),
        "installable_inside_private_network": true,
        "installable_outside_private_network": true,
        "name":name + ":basic",
        "key":"basic",
        "price": {
          "cents": 0,
          "unit": "month",
          "contract": false,
        },
        "available_regions":regions,
        "compliance":[],
        "space_default": false,
        "state": "public",
        "updated_at": "2016-08-09T12:00:00Z",
        "attributes":{}
      }
    ];
  }

  function get_config_vars(pg_pool, service) {
    return {};
  }

  function begin_timers(addon) {
  }

  return function(cb, pg_pool) {
    common.alamo.regions(pg_pool).then((regions) => {
      cb({
        info:info.bind(info,regions.map((x) => x.name)),
        plans:plans.bind(plans,regions.map((x) => x.name)),
        provision,
        unprovision,
        attach,
        detach,
        action,
        get_actions,
        config_vars:get_config_vars,
        get_state:function() { return {"state":"provisioned", "state_description":""} },
        update:function() { throw new common.ConflictError("Cannot upgrade this plan as changes are unsupported")},
        timers:{begin:begin_timers}
      });
    }).catch((e) => console.error(e));
  };
}