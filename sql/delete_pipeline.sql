update pipelines set 
  deleted = true,
  updated = now()
where pipeline = $1