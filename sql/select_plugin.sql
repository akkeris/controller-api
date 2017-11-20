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
  (plugin::varchar(128) = $1 or name::varchar(128) = $1) and deleted = false