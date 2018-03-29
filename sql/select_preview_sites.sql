select
  sites.site, 
  sites."domain", 
  sites.region, 
  regions.name as region_name, 
  sites.created, 
  sites.updated, 
  sites.tags,
  previews.preview as preview_uuid,
  previews.target as preview_target
from
  sites
  join regions on sites.region = regions.region
  join previews on sites.preview = previews.preview
where
  sites.deleted = false and
  previews.target = $1