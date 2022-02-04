insert into action_runs
  (action_run, action, status, source, exit_code, created_by)
values
  ($1, $2, $3, $4, $5, $6)
returning *
