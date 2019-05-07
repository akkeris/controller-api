insert into apps
  (app, created, updated, name, space, org, url, description, labels, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
 returning *