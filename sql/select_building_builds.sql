select
  builds.build,
  apps.app app_uuid,
  apps.name app_name,
  spaces.name space_name,
  (apps.name || '-' || spaces.name) app_key,
  builds.foreign_build_key,
  builds.created,
  builds.updated,
  authorizations.token,
  auto_builds.repo,
  auto_builds.branch,
  builds.author,
  builds.message,
  builds.sha
from 
  builds 
    join apps on builds.app = apps.app
    join spaces on apps.space = spaces.space
    left join auto_builds on builds.auto_build = auto_builds.auto_build
    left join authorizations on auto_builds.authorization = authorizations.authorization
where 
  builds.created > (current_date - interval '1 day') and
  builds.status = 'pending' and
  builds.deleted = false and
  apps.deleted = false and
  spaces.deleted = false
