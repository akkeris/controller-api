insert into filters 
	(filter, name, type, description, options, organization, created_by)
values
	(md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6)
returning *