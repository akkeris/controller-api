update tasks set 
	status = coalesce($2, status), 
	retries = coalesce($3, retries), 
	metadata = coalesce($4, metadata), 
	result = coalesce($5, result), 
	started = coalesce($6, started), 
	finished = coalesce($7, finished),
	updated = now()
where task = $1