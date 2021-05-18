select
  resource_type resource_type_uuid,
  name,
  actions,
  details,
  created,
  updated
from recommendation_resource_types
where deleted = false