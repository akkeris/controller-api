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
where deleted = false