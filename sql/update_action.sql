update actions set
    name = coalesce($2, name),
    description = coalesce($3, description),
    events = coalesce($4, events)
where
    action = $1 and
    deleted = false