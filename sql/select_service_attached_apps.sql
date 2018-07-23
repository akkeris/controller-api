SELECT apps.app, apps.name, spaces.name AS space, service_attachments.owned 
FROM service_attachments 
JOIN (apps
   JOIN spaces
   ON apps.space = spaces.space)  
ON service_attachments.app = apps.app 
WHERE service_attachments.deleted = false 
AND apps.deleted = false 
AND spaces.deleted = false
AND (service_attachments.service::varchar(128) = $1
OR service_attachments.service IN (SELECT service FROM service_attachments WHERE service_attachments.name::varchar(128) = $1));