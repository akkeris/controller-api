select
    topic_config,
    name,
    description,
    cleanup_policy,
    partitions,
    retention_ms,
    replicas,
    sort_order,
    created,
    updated
from 
  topic_configs
where
  deleted = false
order by
  sort_order