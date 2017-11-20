insert into builds
  (build, app, created, updated, sha, checksum, logs, app_logs, size, url, status, repo, branch, version, user_agent, description, deleted, auto_build, foreign_build_key, message, author)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
returning build