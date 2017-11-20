insert into formation_changes (formation_change, formation, app, created, type, command, quantity, port, size, price, healthcheck) 
  (
    select 
      gen_random_uuid(),
      formation, 
      app, 
      now() as created, 
      type,
      coalesce($6, command), 
      coalesce($4, quantity), 
      coalesce($5, port), 
      coalesce($3, size), 
      coalesce($8, price),
      coalesce($7, healthcheck) 
    from 
      formations 
    where 
      (app::varchar(1024) = $1 and type = $2) OR (formation::varchar(1024) = $2)
  );