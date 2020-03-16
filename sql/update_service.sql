update services set 
	plan = $2, 
	plan_name = $3, 
	price = $4,
	foreign_key = coalesce($5, foreign_key),
	updated = now()
where service = $1