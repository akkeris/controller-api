update topic_acls set 
  deleted = true,
  updated = now()
where 
  app = $1 and
  deleted = false
returning 
  *