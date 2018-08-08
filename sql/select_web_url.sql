select 
	url 
from apps 
	join spaces on apps.space = spaces.space 
where 
	apps.name=$1::varchar(1024) and 
	spaces.name=$2::varchar(1024) and
	apps.deleted = false and
	spaces.deleted = false