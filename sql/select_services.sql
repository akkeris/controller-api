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
  join service_attachments on service_attachments.service = services.service and services.deleted = false
  join apps on service_attachments.app = apps.app and apps.deleted = false
  left join service_attachments all_attached on (all_attached.service = services.service and all_attached.deleted = false)
where
  apps.app = $1
  and service_attachments.owned = true
  and service_attachments.deleted = false
group by 
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
  service_attachments.name,
  service_attachments.owned