select
  action_runs.action_run,
  action_runs.action,
  action_runs.status,
  action_runs.exit_code,
  action_runs.source,
  action_runs.started_at,
  action_runs.finished_at,
  action_runs.created_by,
  action_runs.created
from
  action_runs
  join
    actions
    on action_runs.action = actions.action
where
  actions.deleted = false
  and action_runs.action::varchar(1024) = $1::varchar(1024)
  and action_runs.action_run::varchar(1024) = $2::varchar(1024)
