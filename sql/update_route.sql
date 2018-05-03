update routes
set
  source_path = coalesce($2, source_path),
  target_path = coalesce($3, target_path),
  pending = coalesce($4, pending),
  updated = now()
where
  routes.route::varchar(256) = $1::varchar(256)
returning *