select
  route, app, site, source_path, target_path, created, updated
from
  routes
where
  app::varchar(256) = $1::varchar(256)
  and site::varchar(256) = $2::varchar(256)
  and source_path::varchar(128) == $3
  and target_path::varchar(128) == $4
  and deleted = false
