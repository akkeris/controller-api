update recommendations set
    deleted = true,
    updated = now()
where
    recommendation = $1 and
    deleted = false
returning *