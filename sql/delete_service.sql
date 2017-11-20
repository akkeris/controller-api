update services set 
  deleted = true,
  updated = now()
where
  service = $1