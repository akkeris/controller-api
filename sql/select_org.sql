select
  organizations.org, organizations.name, organizations.updated, organizations.created, organizations.description
from 
  organizations
where 
  organizations.name::varchar(128) = $1 and organizations.deleted = false