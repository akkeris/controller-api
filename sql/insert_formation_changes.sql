-- [id, app_uuid, type, command, quantity, port, size];
insert into formation_changes
  (formation_change, formation, app, created, type, command, quantity, port, size, price, healthcheck)
values
  (gen_random_uuid(), $1, $2, now(), $3, $4, $5, $6, $7, $9, $8);

