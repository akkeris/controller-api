select
	region,
	name,
	country,
	description,
	locale,
	private_capable,
	provider_name,
	provider_region,
	provider_availability_zones,
	high_availability,
	case 
		(select count(*) from stacks where stacks.region = regions.region and stacks.deleted = false and stacks.default = true)
		when 1 
		then true 
		else false end as "default",
	created,
	updated,
	deprecated
from
	regions
where
	deleted = false and
	(region::varchar(128) = $1::varchar(128) or name = $1::varchar(128))