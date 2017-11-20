select
  releases.release id, 
  releases.created, 
  releases.updated, 
  releases.build,
  releases.logs, 
  releases.app_logs, 
  releases.status, 
  releases.user_agent,
  releases.description, 
  releases.trigger, 
  releases.trigger_notes,
  organizations.name org, 
  apps.app,
  apps.app app_uuid, 
  apps.name app_name, 
  spaces.name space_name,
  releases.version,
  releases.created = (
    select 
      max(rel.created) 
    from releases rel 
      join apps ap on rel.app = ap.app 
      join spaces s on s.space = ap.space 
    where 
      apps.app = ap.app and 
      ap.deleted = false and 
      rel.deleted = false and 
      rel.status = 'succeeded'
  ) "current"
from
  releases
  join apps on releases.app = apps.app
  join spaces on apps.space = spaces.space
  join organizations on apps.org = organizations.org
where
  ((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1::varchar(128) or apps.app::varchar(128) = $1::varchar(128)) and
  apps.deleted = false and 
  releases.deleted = false and 
  organizations.deleted = false and 
  spaces.deleted = false
order by releases.updated asc