update apps set 
  deleted = true,
  updated = now()
where 
  app = $1