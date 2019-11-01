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
  release_statuses
  join releases on release_statuses.release = releases.release
  join apps on releases.app = apps.app
where
    release_statuses.deleted = false and
    releases.deleted = false and
    apps.deleted = false and
    (release_statuses.release_status::varchar(1024) = $1::varchar(1024) OR release_statuses.context::varchar(1024) = $1::varchar(1024)) and
    release_statuses.release = $2
