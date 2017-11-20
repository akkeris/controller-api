select
  apps.app,
  apps.name,
  releases.release,
  releases.created,
  releases.updated,
  releases.version,
  builds.build
from
  apps
  join releases on (
    releases.app = apps.app AND
    releases.version = (select max(rel.version) from releases rel join apps ap ON rel.app = apps.app AND rel.deleted = false)
  )
  join builds on releases.build = builds.build
where 
  apps.app = $1 and
  apps.deleted = false and
  releases.deleted = false and
  builds.deleted = false