select
  hooks.hook, 
  hooks.events, 
  hooks.url,
  hooks.active,
  hooks.created,
  hooks.updated
from
  hooks join apps on apps.app = hooks.app
where
  hooks.hook::varchar(128) = $1::varchar(256) and
  hooks.deleted = false
