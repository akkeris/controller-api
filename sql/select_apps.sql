select
  apps.app app_uuid, 
  apps.created, 
  apps.updated, 
  apps.name app_name, 
  apps.disabled, 
  spaces.name space_name, 
  spaces.space space_uuid, 
  spaces.tags space_tags,
  organizations.name org_name, 
  organizations.org org_uuid, 
  apps.url, 
  auto_builds.repo,
  (select max(created) from releases where apps.app = releases.app limit 1) released
from 
  apps 
    join spaces on apps.space = spaces.space 
    join organizations on apps.org = organizations.org
    left join auto_builds on apps.app = auto_builds.app and auto_builds.deleted = false
where 
  apps.deleted = false and spaces.deleted = false
order by apps.name, spaces.name desc