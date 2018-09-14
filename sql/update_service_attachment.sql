update service_attachments set
  "primary" = $2,
  secondary_configvar_map_ids = $3
where
  service_attachment::varchar(1024) = $1::varchar(1024)