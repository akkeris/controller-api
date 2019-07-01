update diagnostics set 
  deleted = true,
  updated = now()
where 
  diagnostic = $1