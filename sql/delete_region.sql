update regions set
  deleted = true,
  updated = now()
where
  region::varchar(256) = $1::varchar(256) and
  deleted = false
returning *