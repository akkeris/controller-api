select
  pipeline, created, updated, name, description
from
  pipelines
where
  deleted = false
order by
  name, created