insert into routes (route, app, site, source_path, target_path, created, updated, deleted)
values ($1, $2, $3, $4, $5, $6, $7, false)
returning *