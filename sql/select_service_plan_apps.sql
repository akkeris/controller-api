SELECT apps.app, apps.name 
  FROM services
       JOIN service_attachments 
         ON service_attachments.service = services.service
       JOIN apps
         ON service_attachments.app = apps.app
 WHERE service_attachments.deleted = false 
   AND apps.deleted = false 
   AND services.deleted = false
   AND services.plan::varchar(128) = $1 
    OR services.plan_name = $1;