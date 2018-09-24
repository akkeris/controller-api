update topic_configs set 
  deleted = true,
  updated = now()
where 
  topic_config = $1
returning 
  topic_config