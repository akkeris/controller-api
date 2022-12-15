update actions set
    description = coalesce($2, description),
    events = coalesce($3, events)
where
    action = $1 and
    deleted = false