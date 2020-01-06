insert into config_var_notes 
  (app, created, updated, key, description, required, deleted) 
values
  ($1, now(), now(), $2, coalesce($3, ''), coalesce($4, true), false)
on conflict on constraint pk 
do update set 
  description=coalesce($3, config_var_notes.description),
  required=coalesce($4, config_var_notes.required),
  updated=now(),
  deleted=$5
