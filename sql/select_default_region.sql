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
	true as "default",
	created,
	updated,
	deprecated
from
	regions
where
	deleted = false and
	(select count(*) from stacks where stacks.region = regions.region and stacks.deleted = false and stacks.default = true) = 1