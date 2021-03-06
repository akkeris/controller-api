select
  topic_acls.topic_acl,
  topic_acls.topic,
  topic_acls.app,
  apps.name as app_name,
  topics.topic,
  topics.name as topic_name,
  topics.cluster,
  topic_acls.role,
  topic_acls.consumer_group_name,
  topic_acls.created,
  topic_acls.updated
from topic_acls
join apps on (topic_acls.app = apps.app)
join topics on (topic_acls.topic = topics.topic)
where
  (apps.app::varchar(128) = $1) and
  topic_acls.deleted = false