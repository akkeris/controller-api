insert into authorizations
  ("authorization", created, updated, site, state, scopes, user_id, username, token, expires, invalid, invalid_reason, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)