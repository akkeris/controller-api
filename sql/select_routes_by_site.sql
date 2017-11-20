select
  route, apps.name || '-' || spaces.name app, sites.domain site, source_path, target_path, routes.created, routes.updated
from
  routes
join
  apps on (apps.app = routes.app)
join
  sites on (sites.site = routes.site)
join
  spaces on (spaces.space = apps.space)
where
  (sites.site::varchar(256) = $1::varchar(256) or (sites.domain || '-' || sites.region) = $1::varchar(256))
  and routes.deleted = false
  and sites.deleted = false
