select
  services.service,
  services.addon,
  services.addon_name,
  apps.app,
  services.plan,
  services.plan_name,
  services.price,
  services.foreign_key,
  services.created,
  services.updated,
  services.deleted,
  service_attachments.owned,
  service_attachments.name,
  count(all_attached.*) attachments
from
  services 
  left join service_attachments all_attached on (all_attached.service = services.service and all_attached.deleted = false)
  join service_attachments on (services.service = service_attachments.service and service_attachments.app::varchar(128) = $2::varchar(128) and service_attachments.deleted = false)
  join apps on service_attachments.app = apps.app and apps.deleted = false
where
  (services.service::varchar(128) = $1::varchar(128) or service_attachments.name::varchar(128) = $1::varchar(128))
  and apps.app::varchar(128) = $2::varchar(128)
  and services.deleted = false
group by 
  service_attachments.name,
  service_attachments.owned,
  apps.app,
  services.service,
  services.addon,
  services.addon_name,
  services.plan,
  services.plan_name,
  services.price,
  services.foreign_key,
  services.created,
  services.updated,
  services.deleted