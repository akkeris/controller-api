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
  recommendation = $1