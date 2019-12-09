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
      (rel.status = 'succeeded' or rel.status = 'unknown')
  ) "current",
  array_agg(release_statuses_successful.context) as success_statuses,
  array_agg(release_statuses_pending.context) as pending_statuses,
  array_agg(release_statuses_failure.context) as failure_statuses,
  array_agg(release_statuses_error.context) as error_statuses
from
  releases
  join apps on releases.app = apps.app
  join spaces on apps.space = spaces.space
  join organizations on apps.org = organizations.org
  left join release_statuses as release_statuses_successful on
    releases.release = release_statuses_successful.release and
    release_statuses_successful.deleted = false and
    release_statuses_successful.state = 'success'
  left join release_statuses as release_statuses_pending on
    releases.release = release_statuses_pending.release and
    release_statuses_pending.deleted = false and
    release_statuses_pending.state = 'pending'
  left join release_statuses as release_statuses_failure on
    releases.release = release_statuses_failure.release and
    release_statuses_failure.deleted = false and
    release_statuses_failure.state = 'failure'
  left join release_statuses as release_statuses_error on
    releases.release = release_statuses_error.release and
    release_statuses_error.deleted = false and
    release_statuses_error.state = 'error'
where
  ((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1::varchar(128) or apps.app::varchar(128) = $1::varchar(128)) and
  apps.deleted = false and
  releases.deleted = false and
  organizations.deleted = false and
  spaces.deleted = false
group by
  releases.release,
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
  organizations.name,
  apps.app,
  apps.name,
  spaces.name,
  releases.version
order by releases.updated asc