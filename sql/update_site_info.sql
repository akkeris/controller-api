update sites set
  description = $2,
  labels = $3,
  updated = now()
where
  site::varchar(256) = $1::varchar(256) or domain::varchar(128) = $1::varchar(128)
and deleted = false
returning *