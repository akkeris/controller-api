update 
	features
set
	deleted = true
where 
	features.app = $1 and 
	(
		features.feature::varchar(1024) = $2 or 
		features.name = $2
	) and
	features.deleted = false
returning 
	features.app, features.name, features.feature, features.created, features.updated
