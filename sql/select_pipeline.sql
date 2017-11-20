select
  pipeline, created, updated, name, description
from 
  pipelines
where 
  deleted = false and (pipeline::varchar(1024) = $1 or name::varchar(1024) = $1)