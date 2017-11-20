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
  builds.author,
  builds.message,
  organizations.name org, 
  apps.name, 
  spaces.name space
from
  builds 
    join apps on builds.app = apps.app
    join spaces on apps.space = spaces.space 
    join organizations on apps.org = organizations.org 
where
  ((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1 or apps.app::varchar(128) = $1) and
  apps.deleted = false and builds.deleted = false and spaces.deleted = false and organizations.deleted = false
order by builds.updated asc