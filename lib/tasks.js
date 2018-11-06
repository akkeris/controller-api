
const assert = require('assert');
const common = require('./common.js');
const fs = require('fs');
const lifecycle = require('./lifecycle.js');
const query = require('./query.js');

const select_tasks = query.bind(query, fs.readFileSync("./sql/select_tasks.sql").toString('utf8'), (r) => { return r; });
const add_task = query.bind(query, fs.readFileSync("./sql/add_task.sql").toString('utf8'), (r) => { return r; });
const update_task = query.bind(query, fs.readFileSync("./sql/update_task.sql").toString('utf8'), (r) => { return r; });
const select_unfinished_tasks = query.bind(query, fs.readFileSync("./sql/select_unfinished_tasks.sql").toString('utf8'), (r) => { return r; });

let already_processed_resync_addons = []

async function begin(pg_pool) {
  let task = null
  try {
    let unfinished_tasks = await select_unfinished_tasks(pg_pool, [])
    if (unfinished_tasks[0].count > 0) {
      console.error("ERROR: There are unfinished tasks that are over 24 hours old.")
    }

    task = await select_tasks(pg_pool, [])
    assert.ok(task.length === 0 || task.length === 1, 'We some how pulled off more tasks than we should have!')
    if (task.length > 0) {
      task = task[0]
      switch(task.action) {
        case 'resync-addon-state':
          let addon_id = task.reference
          let app_uuid = task.metadata
          let app = await common.app_exists(pg_pool, app_uuid)
          assert.ok(app && app.app_uuid, 'Cannot find application for resync addon state.')
          let addon = await common.addon_exists(pg_pool, addon_id, app.app_uuid)
          if (addon.state === "provisioned" && !already_processed_resync_addons[addon_id + app_uuid]) {
            // safety mechanism so we don't accidently try this again in the event of an error.
            already_processed_resync_addons[addon_id + app_uuid] = true
            await update_task(pg_pool, [task.task, 'finished', null, null, addon.state, null, new Date()]);
            lifecycle.restart_and_redeploy_app(pg_pool, app.app_uuid, app.app_name, app.space_name, app.org_name, 'Addon ' + addon_id + ' finished provisioning.').catch((err) => { /* do nothing */ });
          } else {
            await update_task(pg_pool, [task.task, 'pending', task.retries + 1, null, null, null, null]);
          }
          break;
        default:
          console.error("Unable to process task: " + task.action)
          break;
      }
    }
  } catch (err) {
    if(task) {
      if (task.retries + 1 > 60) {
        // hard fail if we cannot get this done after 60 tries.
        console.log("Error, failed to process task, giving up: " + task.task)
        await update_task(pg_pool, [task.task, 'failed', task.retries + 1, null, "Error processing: " + err.toString(), null, null]);
      } else {
        await update_task(pg_pool, [task.task, 'pending', task.retries + 1, null, "Error processing: " + err.toString(), null, null]);
      }
    }
    console.error("Error running tasks: ", err)
  } finally {
    setTimeout(() => begin(pg_pool).catch((e) => console.error(e)), 60 * 1000)
  }
}

module.exports = {
  begin,
  add:add_task,
  update:update_task,
}