update hooks set
  events = coalesce($2, events),
  url = coalesce($3, url),
  secret = coalesce($4, secret),
  active = coalesce($4, active),
  updated = now()
where
  hook::varchar(128) = $1::varchar(256)) and
  deleted = false
returning *