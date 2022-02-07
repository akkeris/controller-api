insert into action_runs
  (action_run, action, status, source, exit_code, created_by, run_number)
values
  ($1, $2, $3, $4, $5, $6, (select coalesce(max(run_number), 0) from action_runs where action = $2) + 1)
returning *
