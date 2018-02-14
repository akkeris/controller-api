update app_setups set
	progress = coalesce($2, progress),
	failure_messages = coalesce($3, failure_messages),
	status = coalesce($4, status),
	status_messages = coalesce($5, status_messages)
where
	app_setup::varchar(128) = $1::varchar(128)
returning * 