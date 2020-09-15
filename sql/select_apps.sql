select
  apps.app app_uuid,
  apps.created,
  apps.updated,
  apps.name app_name,
  apps.disabled,
  apps.description description,
  apps.labels labels,
  spaces.name space_name,
  spaces.space space_uuid,
  spaces.tags space_tags,
  stacks.stack stack_uuid,
  stacks.name stack_name,
  regions.region region_uuid,
  regions.name region_name,
  organizations.name org_name,
  organizations.org org_uuid,
  apps.url,
  (select array_to_json(array_agg(json_build_object('id', formations.formation, 'type', formations.type, 'port', formations.port, 'quantity', formations.quantity, 'size', formations.size, 'command', formations.command, 'created_at', formations.created, 'updated_at',formations.updated, 'healthcheck',formations.healthcheck))) from formations where formations.app = apps.app and formations.deleted = false limit 100) formation,
  (select repo from auto_builds where apps.app = auto_builds.app and auto_builds.deleted = false limit 1) repo,
  (select branch from auto_builds where apps.app = auto_builds.app and auto_builds.deleted = false limit 1) repo_branch,
  (select max(created) from releases where apps.app = releases.app limit 1) released,
  (select preview from previews where apps.app = previews.target and previews.deleted = false limit 1) preview
from
  apps
    join spaces on apps.space = spaces.space
    join organizations on apps.org = organizations.org
    join stacks on spaces.stack = stacks.stack and stacks.deleted = false
    join regions on regions.region = stacks.region and regions.deleted = false
where
  apps.deleted = false and
  spaces.deleted = false
order by apps.name, spaces.name desc