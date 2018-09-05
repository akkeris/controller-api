select
  service_attachments.service_attachment,
  service_attachments.name,
  service_attachments.service,
  service_attachments.primary,
  services.addon,
  services.plan,
  services.foreign_key,
  service_attachments.app,
  service_attachments.name,
  apps.app app_uuid,
  apps.name app_name,
  spaces.name space,
  apps.org,
  service_attachments.owned,
  service_attachments.created,
  service_attachments.updated
from
  service_attachments
  join services on service_attachments.service = services.service and services.deleted = false
  join apps on service_attachments.app = apps.app and apps.deleted = false
  join spaces on spaces.space = apps.space and spaces.deleted = false
where
  service_attachments.deleted = false
  and (service_attachments.service::varchar(128) = $1 or service_attachments.name = $1)
  and service_attachments.owned = true
  and service_attachments.deleted = false
