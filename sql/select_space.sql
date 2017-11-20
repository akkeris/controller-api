select
  spaces.space, 
  spaces.created, 
  spaces.updated, 
  spaces.name, 
  spaces.description, 
  spaces.tags, 
  regions.name region_name,
  regions.region region_uuid,
  stacks.name stack_name,
  stacks.stack stack_uuid,
  count(apps.app) as num_apps
from 
  spaces
  join stacks on spaces.stack = stacks.stack
  join regions on regions.region = stacks.region
  left join
    apps on (apps.space = spaces.space and spaces.deleted = false and apps.deleted = false)
where
  (spaces.name::varchar(128) = $1 or spaces.space::varchar(128) = $1) and
  spaces.deleted = false
group by
  spaces.space, spaces.created, spaces.updated, spaces.name, spaces.description, spaces.tags, regions.name, regions.region, stacks.name, stacks.stack