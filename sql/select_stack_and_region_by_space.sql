select 
	regions.name as region_name, 
	stacks.name as stack_name
from
	spaces 
		join stacks on spaces.stack = stacks.stack
		join regions on  regions.region = stacks.region 
where
	(spaces.name::varchar(128) = $1::varchar(128) or spaces.space::varchar(128) = $1::varchar(128)) 
	and spaces.deleted = false 