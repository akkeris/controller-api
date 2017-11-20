update routes set
  deleted = true,
  updated = now()
where
  route::varchar(256) = $1::varchar(256) and
  deleted = false
returning *