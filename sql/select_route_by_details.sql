select
  route, app, site, source_path, target_path, pending, created, updated
from
  routes
where
  site::varchar(256) = $1::varchar(256) and
  source_path = $2 and
  deleted = false
