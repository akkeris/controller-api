select
  release_statuses.context,
  release_statuses.name,
  count(*) as "amount"
from 
  release_statuses
  join releases on release_statuses.release = releases.release
  join apps on releases.app = apps.app
  join pipeline_couplings on apps.app = pipeline_couplings.app
  join pipelines on pipeline_couplings.pipeline = pipelines.pipeline
where
    release_statuses.deleted = false and
    releases.deleted = false and
    apps.deleted = false and
    pipeline_couplings.deleted = false and
    pipelines.deleted = false and 
    (pipelines.pipeline::varchar(1024) = $1 or pipelines.name::varchar(1024) = $1)
group by
  release_statuses.context,
  release_statuses.name