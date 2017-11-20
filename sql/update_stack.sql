update stacks set 
  beta = coalesce($2, beta),
  deprecated = coalesce($3, deprecated),
  updated = now()
where
  stack::varchar(128) = $1::varchar(128)
returning *
