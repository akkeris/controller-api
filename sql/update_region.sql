update regions set 
	country = coalesce($2, country),
	description = coalesce($3, description),
	locale = coalesce($4, locale),
	private_capable = coalesce($5, private_capable),
	provider_name = coalesce($6, provider_name),
	provider_region = coalesce($7, provider_region),
	provider_availability_zones = coalesce($8, provider_availability_zones),
	high_availability = coalesce($9, high_availability),
	deprecated = coalesce($10, deprecated),
	updated = now()
where
	(region::varchar(128) = $1::varchar(128) OR name::varchar(128) = $1::varchar(128)) and
	deleted = false
returning *
	