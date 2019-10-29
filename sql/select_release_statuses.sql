select
  release_status,
  release,
  context,
  name,
  target_url,
  image_url,
  description,
  state,
  created,
  updated
from 
  releases_statuses
  join releases on release_statuses.release = releases.release
  join apps on releases.app = apps.app
where
    releases_statuses.deleted = false and
    releases.deleted = false and
    apps.deleted = false and
    release_statuses.release = $1
