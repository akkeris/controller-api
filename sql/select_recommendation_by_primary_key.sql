select
  recommendation recommendation_uuid,
  app,
  service,
  resource_type,
  action,
  details,
  created,
  updated
from
  recommendations
where
  app = $1
  and service = $2
  and resource_type = $3
  and action = $4