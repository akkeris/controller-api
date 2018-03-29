select
  apps.app app_uuid, 
  apps.created, 
  apps.updated, 
  apps.name app_name,
  apps.disabled,
  spaces.name space_name, 
  spaces.space space_uuid,
  spaces.tags space_tags,
  stacks.stack stack_uuid,
  stacks.name stack_name,
  regions.region region_uuid,
  regions.name region_name,
  organizations.name org_name, 
  organizations.org org_uuid, 
  apps.url, 
  (select repo from auto_builds where apps.app = auto_builds.app and auto_builds.deleted = false limit 1) repo,
  (select max(created) from releases where apps.app = releases.app limit 1) released,
  (select preview from previews where apps.app = previews.target and previews.deleted = false limit 1) preview
from 
  apps 
    join spaces on apps.space = spaces.space 
    join organizations on apps.org = organizations.org
    left join auto_builds on apps.app = auto_builds.app and auto_builds.deleted = false
    join stacks on spaces.stack = stacks.stack and stacks.deleted = false
    join regions on regions.region = stacks.region and regions.deleted = false
where 
  ((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1 or apps.app::varchar(128) = $1) and
  apps.deleted = false and spaces.deleted = false