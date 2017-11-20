update apps
set
  disabled = $2,
  updated = now()
from
  spaces
where
  apps.space = spaces.space and
  apps.app = $1 and
  apps.deleted = false and spaces.deleted = false