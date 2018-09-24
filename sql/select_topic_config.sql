select
    topic_config,
    name,
    description,
    cleanup_policy,
    partitions,
    retention_ms,
    replicas,
    created,
    updated
from 
  topic_configs
where
  (name::varchar(128) = $1 or topic_config::varchar(128) = $1) and
  deleted = false