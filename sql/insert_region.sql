insert into regions
  (region, name, country, description, locale, private_capable, provider_name, provider_region, provider_availability_zones, high_availability) 
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
returning *