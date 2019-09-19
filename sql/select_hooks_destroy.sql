select
  hooks.hook, 
  hooks.events, 
  hooks.url,
  hooks.active,
  hooks.secret,
  hooks.created, 
  hooks.updated
from
  hooks join apps on apps.app = hooks.app
where
  apps.app::varchar(256) = $1::varchar(256) and
  hooks.deleted = false
