with update_diagnostic as (
  update diagnostics 
  set
    app = coalesce($2, app),
    action = coalesce($3, action),
    result = coalesce($4, result),
    image = coalesce($5, image),
    pipeline = $6,
    transitionfrom = $7,
    transitionto = $8,
    timeout = $9,
    startdelay = $10,
    slackchannel = $11,
    command = $12,
    updated = now()
  where
    diagnostic::varchar(128) = $1 and diagnostics.deleted = false
  returning *
)
select 
  diagnostic as diagnostic_uuid,
  update_diagnostic.name as name,
  s2.name as space,
  (apps.name || '-' || spaces.name) as app,
  action,
  result,
  image,
  pipelines.name as pipeline,
  transitionfrom,
  transitionto,
  timeout,
  startdelay,
  slackchannel,
  command,
  organizations.name as org
from
  update_diagnostic
    join apps on update_diagnostic.app = apps.app
    join spaces on apps.space = spaces.space
    left join pipelines on update_diagnostic.pipeline = pipelines.pipeline
    join spaces s2 on update_diagnostic.space = s2.space
    left join organizations on update_diagnostic.org = organizations.org

