select
  apps.app,
  apps.name as app_name,
  spaces.name as space_name,
  spaces.tags as space_tags,
  builds.build,
  builds.created,
  builds.sha,
  organizations.name org,
  auto_builds.repo,
  auto_builds.branch,
  auto_builds.wait_on_status_checks,
  authorizations.site,
  authorizations.token
from
  apps
  join features on apps.app = features.app and features.name = 'auto-release' and features.deleted = false
  join spaces on apps.space = spaces.space
  join organizations on apps.org = organizations.org 
  join builds on apps.app = builds.app
  left join auto_builds on auto_builds.app = apps.app
  left join authorizations on auto_builds.authorization = authorizations.authorization
where
  builds.build = (
    select b.build
    from apps a join builds b on a.app = b.app
    where a.app = apps.app and a.deleted = false and b.deleted = false
    order by b.created desc offset 0 limit 1
  )
  and apps.deleted = false
  and builds.deleted = false
  and auto_builds.deleted = false
  and spaces.deleted = false
  and builds.status = 'succeeded'
  and (select count(*) from releases where releases.app = apps.app and releases.build = builds.build) = 0
  and builds.created > (current_date - interval '1 day')
order by
  builds.created desc