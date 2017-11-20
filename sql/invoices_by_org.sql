select 
  max(now()) as end, min(apps.created) as start 
from 
  apps
  join organizations on apps.org = organizations.org
where
  organizations.name::varchar(128) = $1 or organizations.org::varchar(128) = $1
