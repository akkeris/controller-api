select
  routes.route, routes.app, routes.site, routes.source_path, routes.target_path, routes.created, routes.updated
from
  routes
join
  apps on (apps.app = routes.app),
  sites on (sites.site = routes.site)
where
  routes.deleted = false
  and apps.deleted = false
  and sites.deleted = false
