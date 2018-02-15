select
	features.app,
	features.name,
	features.feature,
	features.created,
	features.updated
from features
where 
	features.app = $1 and
	features.deleted = false