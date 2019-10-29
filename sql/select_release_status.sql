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
    (release_statuses.release_status::varchar(1024) = $1::varchar(1024) OR release_statuses.context::varchar(1024) = $1::varchar(1024)) and
    release_statuses.release = $2
