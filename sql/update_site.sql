update sites set
  "domain" = coalesce($2, "domain"),
  region = coalesce($3, region),
  updated = now()
where
  site::varchar(256) = $1::varchar(256) or domain::varchar(128) = $1::varchar(128)
and deleted = false
returning *