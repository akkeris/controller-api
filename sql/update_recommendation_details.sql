update recommendations set
  details = $2,
  updated = now()
where
  recommendation::varchar(1024) = $1::varchar(1024)
  and deleted = false
returning *