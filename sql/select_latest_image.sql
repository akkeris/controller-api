select
  apps.app,
  apps.name,
  releases.release,
  releases.created,
  releases.updated,
  releases.version,
  builds.build,
  builds.foreign_build_key,
  builds.foreign_build_system,
  building_app.app build_app,
  building_app.name build_app_name,
  building_org.name build_org_name
from
  apps
  join releases on (
    releases.app = apps.app AND
    releases.version = (select max(rel.version) from releases rel join apps ap ON rel.app = apps.app AND rel.deleted = false)
  )
  join builds on releases.build = builds.build
  join apps building_app on building_app.app = builds.app
  join organizations building_org on building_app.org = building_org.org
where 
  apps.app = $1 and
  (releases.status = 'queued' or releases.status = 'pending' or releases.status = 'succeeded' or releases.status = 'unknown') and
  apps.deleted = false and
  releases.deleted = false and
  builds.deleted = false