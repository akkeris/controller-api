select
  resource_type resource_type_uuid,
  name,
  actions,
  details,
  created,
  updated
from recommendation_resource_types
where 
  (resource_type::varchar(1024) = $1 or name = $1) and
  deleted = false