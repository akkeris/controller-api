update formations set 
  quantity = coalesce($4, quantity),
  size = coalesce($3, size),
  port = coalesce($5, port),
  command = coalesce($6, command),
  updated = now(),
  healthcheck = coalesce($7, healthcheck),
  price = coalesce($8, price)
where 
  (app::varchar(1024) = $1 and type = $2) OR (formation::varchar(1024) = $2)
returning *