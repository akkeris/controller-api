update formations set 
  type = coalesce($2, type),
  size = coalesce($3, size),
  command = coalesce($4, command),
  options = coalesce($5, options)
where
  (formation::varchar(1024) = $1)
returning *