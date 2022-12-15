update actions set 
  deleted = true,
  updated = now()
where 
  action::varchar(1024) = $1
returning *