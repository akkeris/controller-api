update release_statuses set
  name = coalesce($3, name),
  image_url = coalesce($4, image_url),
  target_url = coalesce($5, target_url),
  description = coalesce($6, description),
  state = coalesce($7, state),
  updated = now()
where
  (release_statuses.release_status::varchar(1024) = $1::varchar(1024) OR release_statuses.context::varchar(1024) = $1::varchar(1024)) and
  release_statuses.release = $2 and
  release_statuses.deleted = false