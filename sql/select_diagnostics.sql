select 
  diagnostic,
  diagnostics.name as name,
  s2.name as jobspace,
  apps.name as app,
  spaces.name as space,
  action,
  result,
  image,
  pipelines.name as pipeline,
  transitionfrom,
  transitionto,
  timeout,
  startdelay,
  slackchannel,
  command
from
  diagnostics
    join apps on diagnostics.app = apps.app
    join spaces on apps.space = spaces.space
    left join pipelines on pipelines.pipeline = diagnostics.pipeline
    join spaces s2 on diagnostics.jobspace = s2.space
where
  diagnostics.deleted = false
order by
  name, app, space desc