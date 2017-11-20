select
  favorites.favorite,
  favorites.app,
  apps.name app_name,
  favorites.created,
  favorites.updated,
  auto_builds.repo,
  apps.url,
  favorites.deleted,
  organizations.name as org_name,
  spaces.name space_name
from
  favorites, apps
  left join auto_builds on apps.app = auto_builds.app and auto_builds.deleted = false
  join organizations on apps.org = organizations.org
  join spaces on apps.space = spaces.space
where
  favorites.app = apps.app
    and favorites.deleted = false
    and apps.deleted = false
    and favorites.username::varchar(256) = $1
order by
  apps.name