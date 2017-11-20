update organizations set 
  deleted = true,
  updated = now()
where org = $1