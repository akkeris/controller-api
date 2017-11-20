select
  route, app, site, source_path, target_path, created, updated
from
  routes
where
  route::varchar(256) = $1::varchar(256) and deleted = false
