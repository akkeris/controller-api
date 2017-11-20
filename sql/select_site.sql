select
  sites.site, sites."domain", sites.region, regions.name as region_name, sites.created, sites.updated, sites.tags
from
  sites
  	join regions on sites.region = regions.region
where
    (sites.site::varchar(128) = $1::varchar(128)
    or sites.domain::varchar(256) = $1::varchar(256))
    and sites.deleted = false
