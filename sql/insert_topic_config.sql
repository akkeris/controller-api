insert into topic_configs 
  (topic_config, name, description, cleanup_policy, partitions, retention_ms, replicas)
values
  ($1, $2, $3, $4, $5, $6, $7)
returning *