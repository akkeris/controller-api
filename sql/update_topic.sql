update topics set 
  tags = $2,
  --name change not allowed
  description = $3,
  partitions = $4,
  replicas = $5,
  retention_ms = $6,
  cleanup_policy = $7,
  updated = now()
where 
  (topic::varchar(128) = $1 or name::varchar(128) = $1)
returning *