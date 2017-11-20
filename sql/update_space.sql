update spaces set 
  tags = $2,
  description = $3,
  updated = now()
where 
  (space::varchar(128) = $1 or name::varchar(128) = $1)
returning *