update plugins set
  name = coalesce($2, name),
  description = coalesce($3, description),
  owner = coalesce($4, owner),
  email = coalesce($5, email),
  repo = coalesce($6, repo),
  updated = now()
where 
  (plugin::varchar(128) = $1 or name::varchar(128) = $1) and deleted = false
returning *