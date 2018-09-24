insert into topics
  (topic, name, topic_config, partitions, replicas, retention_ms, cleanup_policy, cluster, region, organization, description)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
returning topic