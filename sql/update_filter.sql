update filters set 
	name = coalesce($2, name),
	type = coalesce($3, name),
	description = coalesce($4, name),
	options = $5,
	updated = now()
where
	filter = $1 and deleted = false
returning *