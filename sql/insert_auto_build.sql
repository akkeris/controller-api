insert into auto_builds
  (auto_build, app, created, updated, repo, branch, "authorization", auto_deploy, wait_on_status_checks, user_agent, deleted, validation_token)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)