update service_attachments set 
  deleted = true,
  updated = now()
where
  service = $1 and app = $2
returning *