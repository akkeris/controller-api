update topics set 
  deleted = true,
  updated = now()
where 
  topic = $1
returning 
  *