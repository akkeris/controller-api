insert into topic_acls
  (topic_acl, topic, app, role, consumer_group_name)
values
  ($1, $2, $3, $4, $5)
returning *