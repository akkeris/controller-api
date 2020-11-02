update builds set 
  scm_metadata = $2
where
  deleted = false and
  build = $1
