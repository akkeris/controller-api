update favorites set
  deleted = true,
  updated = now()
where
  (app::varchar(256) = $1::varchar(256) and username = $2 and deleted = false)
returning *