select
  topic_acls.topic_acl,
  topic_acls.topic as topic_id,
  app as app_id,
  apps.name as app_name,
  topic as topic_id,
  topics.name as topic_name,
  topics.cluster,
  topic_acls.role,
  topic_acls.created,
  topic_acls.updated
from topic_acls
join apps using (app)
join topics using (topic)
where topic_acls.deleted = false
and topics.topic::varchar(128) = $1::varchar(128)