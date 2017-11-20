insert into hooks (hook, app, url, events, secret, active, created, updated, deleted)
values ($1, $2, $3, $4, $5, $6, now(), now(), false)
returning *