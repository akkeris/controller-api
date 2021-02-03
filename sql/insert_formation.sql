insert into formations
  (formation, app, created, updated, type, command, quantity, port, size, deleted, healthcheck, price, oneoff, options)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, $13)
returning *