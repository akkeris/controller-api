select 
  case when max(version) is null then 0 else max(version) end + 1 next_version
from releases
  where app = $1