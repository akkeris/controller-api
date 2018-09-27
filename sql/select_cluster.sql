select
  c.cluster,
  region,
  c.name,
  r.name as region_name,
  c.tags,
  c.created,
  c.updated
from clusters c
join regions r using (region)
where
  (c.cluster::varchar(128) = $1 or c.name::varchar(128) || '-' || r.name::varchar(128) = $1) and
  c.deleted = false