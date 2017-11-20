select 
  max(now()) as end, min(apps.created) as start 
from 
  apps
  join spaces on apps.space = spaces.space
where
  spaces.name::varchar(128) = $1 or spaces.space::varchar(128) = $1
