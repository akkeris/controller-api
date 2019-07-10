select 
  diagnostic,
  diagnostics.name as name,
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
  diagnostics
    join apps on diagnostics.app = apps.app
    join spaces on apps.space = spaces.space
    left join pipelines on pipelines.pipeline = diagnostics.pipeline
    join spaces s2 on diagnostics.space = s2.space
    left join organizations on diagnostics.org = organizations.org
where
  diagnostics.deleted = false
order by
  name, app, space desc