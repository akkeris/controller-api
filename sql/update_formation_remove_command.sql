update formations set
  command = null
where 
  (app::varchar(1024) = $1 and type = $2) OR (formation::varchar(1024) = $2)
returning *