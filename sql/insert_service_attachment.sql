insert into service_attachments
  (service_attachment, name, service, app, owned, created, updated, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, false)
returning *