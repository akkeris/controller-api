update builds set 
  status = $2,
  description = $3,
  foreign_build_key = $4,
  updated = now()
where 
  build = $1