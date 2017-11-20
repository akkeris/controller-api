insert into favorites
  (favorite, username, app, deleted, created, updated)
values
  ($1, $2, $3, $4, $5, $6)
returning *