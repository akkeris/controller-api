select
  stacks.stack,
  regions.region region_uuid,
  regions.name region_name,
  regions.private_capable,
  stacks.name,
  stacks.default,
  stacks.beta,
  stacks.created,
  stacks.updated,
  stacks.deprecated
from
  stacks join regions on stacks.region = regions.region
where
  stacks.deleted = false and
  stacks.default = true