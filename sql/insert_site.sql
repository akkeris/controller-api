insert into sites (site, "domain", region, created, updated, tags, deleted)
values ($1, $2, $3, $4, $5, $6, false)
returning *