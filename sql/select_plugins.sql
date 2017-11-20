select
  plugin,
  name,
  description,
  owner,
  email,
  repo,
  created,
  updated
from 
  plugins
where 
  deleted = false
order by name