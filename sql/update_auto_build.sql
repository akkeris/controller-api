update auto_builds set branch = $2 where app = $1 and deleted = false
returning *