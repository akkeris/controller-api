select 
	filter,
	name,
	description,
	type,
	options,
	organization,
	created_by,
	created,
	updated,
	deleted
from filters
where deleted = false and (name = $1 or filter::varchar(1024) = $1)