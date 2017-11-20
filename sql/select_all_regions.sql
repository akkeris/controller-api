select 
  distinct regions.name as region_name 
from 
  regions 
where deleted = false