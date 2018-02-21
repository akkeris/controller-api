insert into features (app, feature, name, created, updated, deleted) values ($1, $2, $3, now(), now(), false)
	on conflict (app, feature) do update set deleted = false, updated = now()
returning 
	features.app, features.name, features.feature, features.created, features.updated
