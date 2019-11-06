select
  release_statuses.release_status,
  release_statuses.release,
  release_statuses.context,
  release_statuses.name,
  release_statuses.target_url,
  release_statuses.image_url,
  release_statuses.description,
  release_statuses.state,
  release_statuses.created,
  release_statuses.updated
from 
  apps
  join releases on releases.app = apps.app
  join release_statuses on release_statuses.release = releases.release
where
    release_statuses.deleted = false and
    releases.deleted = false and
    apps.deleted = false and
    apps.app_uuid = $1
