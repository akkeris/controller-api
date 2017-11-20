update hooks set
  deleted = true,
  updated = now()
where
  hook::varchar(128) = $1::varchar(256) and
  deleted = false
returning *