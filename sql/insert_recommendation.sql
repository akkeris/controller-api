insert into recommendations
  (recommendation, app, service, resource_type, details)
values
  ($1, $2, $3, $4, $5)
returning *