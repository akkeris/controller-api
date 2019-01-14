update topic_acls set 
  deleted = true,
  updated = now()
where 
  topic_acl = $1
returning 
  topic_acl