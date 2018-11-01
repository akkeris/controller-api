insert into topic_acls
  (topic_acl, topic, app, role, consumer_group_name)
values
  ($1, $2, $3, $4, $5)
on conflict on constraint topic_acls_pkey do 
  update set consumer_group_name = topic_acls.consumer_group_name 
returning *