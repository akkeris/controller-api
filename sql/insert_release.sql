insert into releases
  (release, app, created, updated, build, logs, app_logs, status, user_agent, description, trigger, trigger_notes, version, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
