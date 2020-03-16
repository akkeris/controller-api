select
  services.service,
  services.addon,
  services.addon_name,
  apps.app,
  apps.name as app_name,
  spaces.name as space_name,
  organizations.name as org_name,
  services.plan,
  services.plan_name,
  services.price,
  services.foreign_key,
  services.created,
  services.updated,
  services.deleted,
  service_attachments.service_attachment,
  service_attachments.owned,
  service_attachments.name,
  service_attachments.primary,
  count(all_attached.*) attachments
from
  services 
  join service_attachments on service_attachments.service = services.service and services.deleted = false
  join apps on service_attachments.app = apps.app and apps.deleted = false
  join spaces on apps.space = spaces.space and spaces.deleted = false
  join organizations on organizations.org = apps.org and organizations.deleted = false
  left join service_attachments all_attached on (all_attached.service = services.service and all_attached.deleted = false)
where
  service_attachments.owned = true and 
  service_attachments.deleted = false
group by 
  service_attachments.service_attachment,
  services.service,
  services.addon,
  services.addon_name,
  apps.app,
  apps.name,
  spaces.name,
  organizations.name,
  services.plan,
  services.plan_name,
  services.price,
  services.foreign_key,
  services.created,
  services.updated,
  services.deleted,
  service_attachments.name,
  service_attachments.owned,
  service_attachments.primary