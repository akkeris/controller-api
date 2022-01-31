update actions set
    name = coalesce($2, name),
    description = coalesce($3, description)
where
    action = $1 and
    deleted = false