select
  services.service,
  services.addon,
  services.addon_name,
  services.plan,
  services.plan_name,
  services.price,
  services.foreign_key,
  services.created,
  services.updated,
  services.deleted,
  service_attachments.name,
  count(all_attached.*) attachments
from
  services 
  left join service_attachments all_attached on (all_attached.service = services.service and all_attached.deleted = false)
  join service_attachments on (services.service = service_attachments.service and service_attachments.app::varchar(128) = $2::varchar(128) and service_attachments.deleted = false)
where
  (services.service::varchar(128) = $1::varchar(128) or service_attachments.name::varchar(128) = $1::varchar(128))
  and services.deleted = false
group by 
  service_attachments.name,
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