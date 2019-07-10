with insert_diagnostic as (
  insert into diagnostics
    (diagnostic, name, space, app, action, result, image, pipeline, transitionfrom, transitionto, timeout, startdelay, slackchannel, command, org)
  values
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  returning *
)
select 
  diagnostic as diagnostic_uuid,
  insert_diagnostic.name as name,
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
  insert_diagnostic
    join apps on insert_diagnostic.app = apps.app
    join spaces on apps.space = spaces.space
    left join pipelines on insert_diagnostic.pipeline = pipelines.pipeline
    join spaces s2 on insert_diagnostic.space = s2.space
    left join organizations on insert_diagnostic.org = organizations.org