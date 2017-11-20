  select
    certificates.certificate,
    certificates.name,
    certificates.request,
    certificates.comments,
    certificates.created,
    certificates.created_by,
    organizations.org,
    organizations.name as org_name,
    (select name from certificate_domain_names cds where cds.certificate = certificates.certificate and common_name = true limit 1) as common_name,
    array_to_string(array_agg( (certificate_domain_names.name) ), ',') as domain_names,
    certificates.installed,
    certificates.status,
    certificates.expires,
    certificates.issued,
    certificates.updated,
    regions.name as region_name,
    regions.region as region_uuid
  from
    certificates 
      join regions on regions.region = certificates.region
      join certificate_domain_names on certificate_domain_names.certificate = certificates.certificate
      join organizations on certificates.org = organizations.org
  where
    certificates.deleted = false and 
    (certificates.certificate::varchar(128)) = $1::varchar(128) or ($1::varchar(128) = certificates.name::varchar(128))
  group by
    regions.name,
    regions.region,
    certificates.certificate,
    organizations.org