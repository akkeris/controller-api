insert into topic_acls
  (topic_acl, topic, app, role)
values
  ($1, $2, $3, $4)
returning *