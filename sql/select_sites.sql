select
  sites.site,
  sites."domain",
  sites.region,
  regions.name as region_name,
  sites.created,
  sites.updated,
  sites.tags,
  sites.description,
  sites.labels
from
  sites
  	join regions on sites.region = regions.region
where
  sites.deleted = false
