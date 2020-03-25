const fs = require('fs');
const common = require('./common.js');
const httph = require('./http_helper.js');
const query = require('./query.js');

// private
function acl_to_response(acl) {
  return {
    id: acl.topic_acl,
    topic: acl.topic,
    app: acl.app,
    app_name: acl.app_name,
    space_name: acl.space_name,
    role: acl.role,
    consumerGroupName: acl.consumer_group_name,
    created: acl.created,
    updated: acl.updated,
  };
}

// const select_acl = query.bind(query, fs.readFileSync('./sql/select_topic_acl.sql').toString('utf8'), null);
const select_acls_by_topic = query.bind(query, fs.readFileSync('./sql/select_topic_acls_by_topic.sql').toString('utf8'), null);
const select_acl_by_app_and_topic_and_role = query.bind(query, fs.readFileSync('./sql/select_topic_acl_by_app_and_topic_and_role.sql').toString('utf8'), null);
const select_acl_by_app_and_topic_and_role_and_consumergroup = query.bind(query, fs.readFileSync('./sql/select_topic_acl_by_app_and_topic_and_role_and_consumergroup.sql').toString('utf8'), null);
const select_acls_by_app = query.bind(query, fs.readFileSync('./sql/select_topic_acls_by_app.sql').toString('utf8'), null);
const insert_acl = query.bind(query, fs.readFileSync('./sql/insert_topic_acl.sql').toString('utf8'), null);
const delete_acl = query.bind(query, fs.readFileSync('./sql/delete_topic_acl.sql').toString('utf8'), null);
const delete_acls_by_app = query.bind(query, fs.readFileSync('./sql/delete_topic_acls_by_app.sql').toString('utf8'), null);

async function list_by_topic(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const { cluster: cluster_uuid } = await common.cluster_exists(pg_pool, cluster_key);

  const topic_key = httph.second_match(req.url, regex);
  const { topic: topic_uuid } = await common.topic_exists(pg_pool, topic_key, cluster_uuid);

  const data = await select_acls_by_topic(pg_pool, [topic_uuid]);
  return httph.ok_response(res, data.map(acl_to_response));
}

async function list_by_app(pg_pool, req, res, regex) {
  const app_key = httph.first_match(req.url, regex);

  const { app_uuid } = await common.app_exists(pg_pool, app_key);

  const data = await select_acls_by_app(pg_pool, [app_uuid]);
  return httph.ok_response(res, JSON.stringify(data));
}

async function create(pg_pool, req, res, regex) {
  const payload = await httph.buffer_json(req);

  const cluster_key = httph.first_match(req.url, regex);
  const { name: cluster_name, cluster: cluster_uuid, region_name } = await common.cluster_exists(pg_pool, cluster_key);

  const topic_key = httph.second_match(req.url, regex);
  const { topic: topic_uuid, name: topic_name } = await common.topic_exists(pg_pool, topic_key, cluster_uuid);

  if (!payload.app) {
    throw new common.UnprocessibleEntityError('The specified request contained an invalid "app" field.');
  }

  const { app_uuid, app_name, space_name } = await common.app_exists(pg_pool, payload.app);

  const { role } = payload;
  if (!role) {
    throw new common.UnprocessibleEntityError('The specified request contained an invalid "app" field.');
  }

  const cg = payload.consumerGroupName;
  // Create in system
  const { id, consumerGroupName } = await common.alamo.topic_acls.create(
    region_name,
    cluster_name,
    topic_name,
    app_name,
    space_name,
    role,
    cg,
  );

  // Create in DB
  const result = await insert_acl(pg_pool, [id, topic_uuid, app_uuid, role, consumerGroupName]);

  return httph.ok_response(res, JSON.stringify(acl_to_response(result[0])));
}

async function remove(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const { region_name } = await common.cluster_exists(pg_pool, cluster_key);
  const topic_key = httph.second_match(req.url, regex);
  const acl_key = httph.third_match(req.url, regex);
  const { topic: topic_uuid } = await common.topic_exists(pg_pool, topic_key, cluster_key);
  const role = httph.fourth_match(req.url, regex);
  let acl_id;

  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(acl_key)) {
    acl_id = acl_key;
  } else {
    // ACL key could be an app name.
    const { app_uuid } = await common.app_exists(pg_pool, acl_key);

    const acls = await select_acl_by_app_and_topic_and_role(pg_pool, [app_uuid, topic_uuid, role]);
    if (!acls || acls.length === 0) {
      throw new httph.NotFoundError(`No ACL found for topic ${topic_key} and app ${acl_key} in role ${role}.`);
    }

    acl_id = acls[0].topic_acl;
  }

  await common.alamo.topic_acls.delete(region_name, acl_id);

  await delete_acl(pg_pool, [acl_id]);

  return httph.ok_response(res, JSON.stringify({ result: 'success' }));
}

async function remove_consumer(pg_pool, req, res, regex) {
  const cluster_key = httph.first_match(req.url, regex);
  const { region_name } = await common.cluster_exists(pg_pool, cluster_key);
  const topic_key = httph.second_match(req.url, regex);
  const acl_key = httph.third_match(req.url, regex);
  const { topic: topic_uuid } = await common.topic_exists(pg_pool, topic_key, cluster_key);
  const role = httph.fourth_match(req.url, regex);
  const consumer_group_name = httph.fifth_match(req.url, regex);
  let acl_id;

  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(acl_key)) {
    acl_id = acl_key;
  } else {
    // ACL key could be an app name.
    const { app_uuid } = await common.app_exists(pg_pool, acl_key);

    const acls = await select_acl_by_app_and_topic_and_role_and_consumergroup(
      pg_pool,
      [
        app_uuid,
        topic_uuid,
        role,
        consumer_group_name,
      ],
    );
    if (!acls || acls.length === 0) {
      throw new httph.NotFoundError(`No ACL found for topic ${topic_key} and app ${acl_key} in role ${role}.`);
    }
    acl_id = acls[0].topic_acl;
  }

  await common.alamo.topic_acls.delete(region_name, acl_id);

  await delete_acl(pg_pool, [acl_id]);

  return httph.ok_response(res, JSON.stringify({ result: 'success' }));
}

async function handle_kafka_addon_delete(pg_pool, addon_change) {
  if (addon_change.change === 'delete' && addon_change.changes.length > 0) {
    // TODO: ESLint - Refactor this to not use "for in"
    // eslint-disable-next-line
    for (const i in addon_change.changes) {
      const change = addon_change.changes[i];
      if (change.addon_service.name === 'kafka') {
        // eslint-disable-next-line no-await-in-loop
        await delete_acls_by_app(pg_pool, [change.app.id]);
      }
    }
  }
}

function init(pg_pool) {
  common.lifecycle.on('addon_change', handle_kafka_addon_delete.bind(null, pg_pool));
}

module.exports = {
  init,
  list_by_topic,
  list_by_app,
  create,
  delete: remove,
  delete_consumer: remove_consumer,
};
