select
  builds.build,
  builds.app,
  builds.created,
  builds.updated,
  builds.sha,
  builds.checksum,
  builds.logs,
  builds.app_logs,
  builds.size,
  builds.url,
  builds.status,
  builds.repo,
  builds.branch,
  builds.version,
  builds.user_agent,
  builds.description,
  builds.deleted,
  builds.auto_build,
  builds.foreign_build_key,
  builds.foreign_build_system,
  organizations.name org, 
  apps.name, 
  spaces.name space,
  builds.author,
  builds.message
from 
  builds 
    join apps on builds.app = apps.app
    join spaces on apps.space = spaces.space 
    join organizations on apps.org = organizations.org 
where 
  builds.build = $1 and 
  builds.deleted = false and 
  ((apps.deleted = false and $2 = false) or ($2 = true)) and
  ((spaces.deleted = false and $2 = false) or ($2 = true)) and
  ((organizations.deleted = false and $2 = false) or ($2 = true))