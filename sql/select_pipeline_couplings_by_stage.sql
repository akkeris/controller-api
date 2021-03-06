select
  pipeline_couplings.pipeline_coupling,
  pipeline_couplings.created, 
  pipeline_couplings.updated,  
  pipeline_couplings.app, 
  pipeline_couplings.stage,
  pipeline_couplings.required_status_checks,
  pipelines.pipeline,
  pipelines.name,
  apps.app app_uuid, 
  apps.name app_name, 
  spaces.name space_name,
  spaces.tags space_tags,
  releases.release,
  releases.updated release_name,
  releases.version release_version,
  releases.build release_build,
  organizations.name org,
  builds.repo build_repo,
  builds.branch build_branch,
  builds.sha build_sha,
  builds.updated as build_updated,
  builds.author as build_author,
  builds.message as build_message
from 
  pipeline_couplings
    join pipelines on pipeline_couplings.pipeline = pipelines.pipeline
    join apps on pipeline_couplings.app = apps.app
    join spaces on apps.space = spaces.space
    join organizations on organizations.org = apps.org
    left join releases on releases.app = apps.app and releases.created = (select max(created) as created from releases r where r.app = apps.app and (r.status = 'succeeded' or r.status = 'unknown'))
    left join builds on releases.build = builds.build
where
  (pipelines.pipeline::varchar(1024) = $1 or pipelines.name::varchar(1024) = $1) and
  pipeline_couplings.stage = $2 and
  pipeline_couplings.deleted = false and
  pipelines.deleted = false and
  apps.deleted = false and
  spaces.deleted = false and
  organizations.deleted = false

