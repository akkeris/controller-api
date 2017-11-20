select 
  auto_builds.created,
  auto_builds.updated,
  auto_builds.auto_build, 
  auto_builds.repo, 
  auto_builds.branch, 
  auto_builds.auto_deploy, 
  auto_builds.wait_on_status_checks,
  authorizations.site, 
  authorizations.username,
  organizations.name org,
  organizations.org organization, 
  apps.app app,
  apps.name appname,
  spaces.space,
  spaces.name spacename
from
  auto_builds
    join apps on auto_builds.app = apps.app
    join authorizations on auto_builds.authorization = authorizations.authorization
    join spaces on apps.space = spaces.space 
    join organizations on apps.org = organizations.org
where
  (((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1) or apps.app::varchar(128) = $1::varchar(128)) and
  apps.deleted = false and auto_builds.deleted = false and
  authorizations.deleted = false and authorizations.invalid = false and
  spaces.deleted = false and organizations.deleted = false