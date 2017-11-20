insert into services
  (service, addon, addon_name, plan, plan_name, price, foreign_key, created, updated, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
returning *