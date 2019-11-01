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
  releases_statuses
  join releases on release_statuses.release = releases.release
  join apps on releases.app = apps.app
where
    releases_statuses.deleted = false and
    releases.deleted = false and
    apps.deleted = false and
    release_statuses.release = $1
