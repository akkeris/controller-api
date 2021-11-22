select
  apps.app app_uuid,
  apps.created,
  apps.updated,
  apps.name app_name,
  apps.disabled,
  apps.description description,
  apps.labels labels,
  spaces.name space_name,
  spaces.space space_uuid,
  stacks.stack stack_uuid,
  stacks.name stack_name,
  regions.region region_uuid,
  regions.name region_name,
  organizations.name org_name,
  organizations.org org_uuid,
  apps.url,
  (select preview from previews where apps.app = previews.target and previews.deleted = false limit 1) preview
from
  apps
    join spaces on apps.space = spaces.space
    join organizations on apps.org = organizations.org
    join stacks on spaces.stack = stacks.stack and stacks.deleted = false
    join regions on regions.region = stacks.region and regions.deleted = false
where
  apps.deleted = false and
  spaces.deleted = false
order by apps.name, spaces.name desc