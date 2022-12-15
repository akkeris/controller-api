update action_runs set
    status = coalesce($3, status),
    exit_code = coalesce($4, exit_code),
    started_at = coalesce($5, started_at),
    finished_at = coalesce($6, finished_at)
where
    action_runs.action::varchar(1024) = $1::varchar(1024)
    and action_runs.action_run::varchar(1024) = $2::varchar(1024)