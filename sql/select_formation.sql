select
  apps.app,
  apps.name appname,
  formations.command,
  formations.created,
  formations.formation,
  formations.quantity,
  formations.size,
  formations.type,
  formations.command,
  formations.port,
  formations.updated,
  formations.healthcheck
from 
  formations 
    join apps on formations.app = apps.app
    join spaces on apps.space = spaces.space
    join organizations on apps.org = organizations.org
where
  formations.deleted = false
  and apps.deleted = false
  and spaces.deleted = false
  and organizations.deleted = false
  and apps.app::varchar(1024) = $1::varchar(1024)
  and (formations.formation::varchar(1024) = $2::varchar(1024) or formations.type = $2)