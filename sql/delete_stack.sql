update stacks set
  deleted = true,
  updated = now()
where
  stack::varchar(256) = $1::varchar(256) and
  deleted = false
returning *