select 
	apps.app
from 
	previews
		join apps on previews.source = apps.app and apps.deleted = false
where
	previews.target = $1 and
	previews.deleted = false
