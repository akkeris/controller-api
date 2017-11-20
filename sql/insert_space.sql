insert into spaces
  (space, stack, created, updated, name, description, tags, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, false)