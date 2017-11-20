select
  organizations.org, organizations.name, organizations.updated, organizations.created, organizations.description
from 
  organizations
where 
  organizations.deleted = false