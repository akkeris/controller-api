insert into actions
  (action, app, formation, name, description, created_by)
values
  ($1, $2, $3, $4, $5, $6)
returning *
