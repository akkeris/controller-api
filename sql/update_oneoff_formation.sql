update formations set 
  size = coalesce($2, size),
  command = coalesce($3, command),
  options = coalesce($4, options)
where
  (formation::varchar(1024) = $1)
returning *