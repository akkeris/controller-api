SELECT apps.app, apps.name, spaces.name AS space 
  FROM services
       JOIN service_attachments 
         ON service_attachments.service = services.service
       JOIN apps
         ON service_attachments.app = apps.app
       JOIN spaces
         ON apps.space = spaces.space
 WHERE service_attachments.deleted = false 
   AND apps.deleted = false 
   AND services.deleted = false
   AND spaces.deleted = false
   AND services.plan::varchar(128) = $1
    OR services.plan_name = $1;