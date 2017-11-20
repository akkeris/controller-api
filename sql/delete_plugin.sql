update plugins set
  deleted = true,
  updated = now()
where
  (plugin::varchar(128) = $1 or name::varchar(128) = $1) and 
  deleted = false
returning *