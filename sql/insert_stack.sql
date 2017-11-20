insert into stacks
  (stack, region, name, beta, deprecated, created, updated, deleted) 
values
  ($1, $2, $3, $4, $5, now(), now(), false)
returning *