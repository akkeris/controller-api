select 
  auto_builds.auto_build, 
  auto_builds.app, 
  auto_builds.repo, 
  auto_builds.branch, 
  case when features.feature is null then false else true end auto_deploy,
  auto_builds.validation_token,
  authorizations.user_id, 
  authorizations.username, 
  authorizations.token,
  organizations.name org, 
  apps.name appname, 
  spaces.name spacename
from
  auto_builds
    join apps on auto_builds.app = apps.app
    left join features on apps.app = features.app and features.name = 'auto-release' and features.deleted = false
    join authorizations on  auto_builds.authorization = authorizations.authorization
    join spaces on apps.space = spaces.space 
    join organizations on apps.org = organizations.org
where
  ((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1 or apps.app::varchar(128) = $1::varchar(128)) and
  apps.deleted = false and auto_builds.deleted = false and
  authorizations.deleted = false and authorizations.invalid = false and
  spaces.deleted = false and organizations.deleted = false