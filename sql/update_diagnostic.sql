update diagnostics 
set
  app = coalesce($2, app),
  action = coalesce($3, action),
  result = coalesce($4, result),
  image = coalesce($5, image),
  pipeline = $6,
  transitionfrom = $7,
  transitionto = $8,
  timeout = $9,
  startdelay = $10,
  slackchannel = $11,
  command = $12,
  updated = now()
where
  diagnostic::varchar(128) = $1 and diagnostics.deleted = false
returning *