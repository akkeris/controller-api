update apps
set
  updated = now(),
  description = $2,
  labels = $3
from
  spaces
where
  apps.space = spaces.space and
  apps.app = $1 and
  apps.deleted = false and spaces.deleted = false