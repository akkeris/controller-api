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
  (topics.name::varchar(128) = $1 or topics.topic::varchar(128) = $1) and
  (clusters.cluster::varchar(128) = $2 or clusters.name::varchar(128) || '-' || regions.name::varchar(128) = $2) and
  topics.deleted = false