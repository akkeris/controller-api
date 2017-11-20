update auto_builds set
  deleted = true,
  updated = now()
from 
  apps join spaces on apps.space = spaces.space
where
  auto_builds.app = apps.app and
  auto_builds.deleted = false and
  (((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1) or apps.app::varchar(128) = $1::varchar(128))