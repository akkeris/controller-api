update recommendations set
  details = $1
where
  recommendation::varchar(1024) = $1::varchar(1024)
returning *