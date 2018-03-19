select
  routes.route, 
  routes.app, 
  routes.site,
  sites.tags,
  sites.region,
  sites.domain,
  apps.name as app_name,
  spaces.name as space_name,
  routes.source_path, 
  routes.target_path, 
  routes.created, 
  routes.updated
from
  routes
  join apps on apps.app = routes.app
  join spaces on spaces.space = apps.space
  join sites on sites.site = routes.site
where
  routes.route::varchar(256) = $1::varchar(256) and 
  routes.deleted = false and 
  sites.deleted = false and
  apps.deleted = false
