update service_attachments set 
  deleted = true,
  updated = now()
where
  app = $1
returning *