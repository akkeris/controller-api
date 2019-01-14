update service_attachments set
  name = $3
where
  app::varchar(1024) = $1::varchar(1024) and (service_attachment::varchar(1024) = $2::varchar(1024) or name = $2::varchar(1024))