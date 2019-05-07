insert into sites (site, "domain", region, created, updated, tags, description, labels, deleted)
values ($1, $2, $3, $4, $5, $6, $7, $8, false)
returning *