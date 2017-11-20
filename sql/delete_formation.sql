update formations set 
  deleted = true,
  updated = now()
where 
  (app::varchar(1024) = $1 and type = $2) OR (formation::varchar(1024) = $2)
returning *