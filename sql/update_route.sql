update routes
set
  source_path = coalesce($2, source_path),
  target_path = coalesce($3, target_path),
  updated = now(),
  sites.domain,
  apps.name app_name,
  spaces.name space_name
from
  apps, spaces, sites
where
  routes.app::varchar(256) = apps.app::varchar(256) and
  apps.space::varchar(256) = spaces.space::varchar(256) and
  routes.site::varchar(256) = sites.site::varchar(256) and
  routes.route::varchar(256) = $1::varchar(256) and
  apps.deleted = false and spaces.deleted = false and sites.deleted = false
returning *