select
  actions.name,
  (
    select
      json_build_object('id', formations.formation, 'type', formations.type, 'size', formations.size, 'command', formations.command)
    from
      formations
    where
      formations.app = apps.app
      and formations.formation = actions.formation
      and formations.deleted = false
  ) formation
from
  actions
  join
    apps
    on apps.app = actions.app
  join
    formations
    on formations.formation = actions.formation
where
  actions.deleted = false
  and apps.deleted = false
  and apps.app::varchar(1024) = $1::varchar(1024)
  and
  (
    actions.action::varchar(1024) = $2::varchar(1024)
    or actions.name = $2
  )
;
