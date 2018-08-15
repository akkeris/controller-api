select 
	regions.name as region_name
from
	sites 
		join regions on  regions.region = sites.region 
where
	(sites.domain::varchar(128) = $1::varchar(128) or sites.site::varchar(128) = $1::varchar(128)) 
	and sites.deleted = false 