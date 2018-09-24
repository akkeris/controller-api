select
  service_attachments.service_attachment,
  service_attachments.name,
  service_attachments.service,
  service_attachments.primary,
  services.addon,
  services.plan,
  services.foreign_key,
  service_attachments.app,
  owner.app owner_app,
  owner.name owner_app_name,
  owner.space owner_space,
  service_attachments.name,
  apps.name app_name,
  apps.org,
  spaces.name space,
  service_attachments.owned,
  service_attachments.created,
  service_attachments.updated
from
  service_attachments
  join services on service_attachments.service = services.service and services.deleted = false
  join apps on service_attachments.app = apps.app and apps.deleted = false
  join spaces on spaces.space = apps.space and spaces.deleted = false
  left join
    (
      select
        owner_services.service,
        owner_app.app,
        owner_app.name,
        owner_space.name space
      from
        service_attachments owner_attachment
        join services owner_services on owner_attachment.service = owner_services.service and owner_services.deleted = false
        join apps owner_app on owner_attachment.app = owner_app.app and owner_app.deleted = false
        join spaces owner_space on owner_space.space = owner_app.space and owner_space.deleted = false
      where
        owner_attachment.deleted = false and
        owner_attachment.owned = true
    ) owner on service_attachments.service = owner.service
where
  service_attachments.deleted = false
  and (
        (apps.app::varchar(128) = $1 and (service_attachments.service_attachment::varchar(128) = $2 or service_attachments.name = $2)) or 
        (service_attachments.service_attachment::varchar(128) = $1 and $2 is null) or 
        (service_attachments.name = $1 and $2 is null) 
      )
  and services.deleted = false
