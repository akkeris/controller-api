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
where c.deleted = false