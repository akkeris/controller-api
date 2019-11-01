select
  releases_statuses.release_status,
  releases_statuses.release,
  releases_statuses.context,
  releases_statuses.name,
  releases_statuses.target_url,
  releases_statuses.image_url,
  releases_statuses.description,
  releases_statuses.state,
  releases_statuses.created,
  releases_statuses.updated
from 
  apps
  join releases on releases.app = apps.app
  join releases_statuses on release_statuses.release = releases.release
where
    releases_statuses.deleted = false and
    releases.deleted = false and
    apps.deleted = false and
    apps.app_uuid = $1
