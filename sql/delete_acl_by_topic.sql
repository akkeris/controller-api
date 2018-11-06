update topic_acls  
set 
  deleted = true,
  updated = now()

where topic = $1
returning 
  a.topic_acl