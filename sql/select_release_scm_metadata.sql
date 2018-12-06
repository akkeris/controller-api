select 
	releases.release,
	releases.scm_metadata
from 
	releases
where
	releases.deleted = false and
	releases.release = $1