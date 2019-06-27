update filters set 
	name = $2,
	type = $3,
	description = $4,
	options = $5,
	updated = now()
where
	filter = $1 and deleted = false
returning *