select 
  builds.build,
  builds.scm_metadata
from 
  builds
where
  builds.deleted = false and
  builds.build = $1
