update topic_configs set
    name = $2,
    description = $3,
    cleanup_policy = $4,
    partitions = $5,
    retention_ms = $6,
    replicas = $7,
    sort_order = $8,
    updated = now()
where
  (topic_config::varchar(256) = $1::varchar(256) or name::varchar(128) = $1::varchar(128))
  and deleted = false
returning *