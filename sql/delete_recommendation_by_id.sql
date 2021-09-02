-- Need to set action to a unique string
-- In this case, "[action]_deleted_[timestamp]_[random_chars]"
update recommendations set
    deleted = true,
    updated = now(),
    action = recommendations.action || '_deleted_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 0, 8)
where
    recommendation = $1 and
    deleted = false
returning *