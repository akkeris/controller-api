select
  topics.topic,
  topics.name, 
  clusters.name as cluster_name,
  topics.config,
  topics.description, 
  topics.partitions, 
  topics.replicas, 
  topics.retention_ms, 
  topics.cleanup_policy, 
  topics.cluster,
  regions.name as region_name,
  topics.organization,
  topics.created,
  topics.updated
from 
  topics
join 
  clusters on (clusters.cluster = topics.cluster)
join  
  regions on (regions.region = clusters.region)
where
  (clusters.cluster::varchar(128) = $1 or clusters.name::varchar(128) || '-' || regions.name::varchar(128) = $1) and
  topics.deleted = false
order by
  topics.name