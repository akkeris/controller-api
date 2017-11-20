select
  service_attachments.service_attachment,
  service_attachments.name,
  service_attachments.service,
  services.addon,
  services.plan,
  service_attachments.app,
  owner_app.name owner_app_name,
  owner_space.name owner_space,
  service_attachments.name,
  apps.name app_name,
  spaces.name space,
  service_attachments.owned,
  service_attachments.created,
  service_attachments.updated
from
  service_attachments
  left join service_attachments owner_attachment on service_attachments.service = owner_attachment.service
                                                    and owner_attachment.deleted = false
                                                    and owner_attachment.owned = true
  left join apps owner_app on owner_attachment.app = owner_app.app and owner_app.deleted = false
  left join spaces owner_space on owner_space.space = owner_app.space and owner_space.deleted = false
  join services on service_attachments.service = services.service and services.deleted = false
  join apps on service_attachments.app = apps.app and apps.deleted = false
  join spaces on spaces.space = apps.space and spaces.deleted = false
where
  service_attachments.deleted = false
