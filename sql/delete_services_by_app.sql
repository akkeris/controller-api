update services set
  deleted = true,
  updated = now()
from
  service_attachments
where
  service_attachments.service = services.service and 
  service_attachments.app = $1
returning *