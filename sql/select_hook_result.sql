select
  apps.app as app_uuid,
  apps.name as app_name,
  spaces.name as space_name,
  hook_result,
  hooks.hook,
  hook_results.events,
  hook_results.url,
  response_code,
  response_headers,
  response_body,
  payload_headers,
  payload_body,
  hook_results.created
from hook_results
  join hooks on hooks.hook = hook_results.hook
  join apps on hooks.app = apps.app
  join spaces on apps.space = spaces.space
where
  ((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1 or apps.app::varchar(128) = $1) 
  and apps.deleted = false 
  and spaces.deleted = false
  and hooks.hook = $2
  and hook_results.hook_result = $3