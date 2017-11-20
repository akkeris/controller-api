insert into plugins (plugin, name, description, owner, email, repo, created, updated, deleted)
values ($1, $2, $3, $4, $5, $6, $7, $8, false)
returning *