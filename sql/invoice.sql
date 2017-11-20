select * from (
    select
      organizations.name as organization,
      spaces.name as space,
      apps.name as app,
      services.plan_name || ' addon' as item,
      'addon' as type,
      1 as quantity,
      services.price/100 as monthly_price,
      organizations.description as contact,
      case when apps.deleted = true then true else services.deleted end as was_removed,
      services.created as created_on,
      case services.deleted
        when true
        then services.updated
        else (case apps.deleted when true then apps.updated else null end)
      end as deleted_on
    from services
      join service_attachments on services.service = service_attachments.service and service_attachments.owned = true
      join apps on service_attachments.app = apps.app
      join spaces on spaces.space = apps.space
      join organizations on apps.org = organizations.org
    where
      (
        (services.deleted = false and services.created < date_trunc('month', $1::timestamptz) + '1 month'::interval - '1 day'::interval) OR
        (services.deleted = TRUE and services.updated < date_trunc('month', $1::timestamptz) + '1 month'::interval - '1 day'::interval and services.updated > date_trunc('month', $1::timestamptz))
      ) and
      (
        (apps.deleted = false and apps.created < date_trunc('month', $1::timestamptz) + '1 month'::interval - '1 day'::interval) OR
        (apps.deleted = true and apps.updated < date_trunc('month', $1::timestamptz) + '1 month'::interval - '1 day'::interval and apps.updated > date_trunc('month', $1::timestamptz))
      )
    
    union

    select
      organizations.name as organization,
      spaces.name as space,
      apps.name as app,
      (formation_changes.size || ' ' || formation_changes.type || ' dyno') as item,
      'dyno' as type,
      formation_changes.quantity,
      formation_changes.price/100 as monthly_price,
      organizations.description as contact,
      case 
        when 
          (select created
            from formation_changes b
            where b.formation = formation_changes.formation
              and b.app = formation_changes.app
              and b.formation_change != formation_changes.formation_change
              and b.created > formation_changes.created
              order by b.created limit 1) is not null
        then true
        else apps.deleted 
        end as was_removed,
      formation_changes.created as created_on,
      case 
        when 
          (select created
            from formation_changes b
            where b.formation = formation_changes.formation
              and b.app = formation_changes.app
              and b.formation_change != formation_changes.formation_change
              and b.created > formation_changes.created
              order by b.created limit 1) is not null
        then
          (select created
            from formation_changes b
            where b.formation = formation_changes.formation
              and b.app = formation_changes.app
              and b.formation_change != formation_changes.formation_change
              and b.created > formation_changes.created
            order by b.created
            limit 1)
        else
          case apps.deleted when true then apps.updated else null end
        end as deleted_on
    from formation_changes
      join apps on formation_changes.app = apps.app
      join spaces on spaces.space = apps.space
      join organizations on apps.org = organizations.org
    where
      (
        (apps.deleted = false and apps.created < date_trunc('month', $1::timestamptz) + '1 month'::interval - '1 day'::interval) OR
        (apps.deleted = true and apps.updated < date_trunc('month', $1::timestamptz) + '1 month'::interval - '1 day'::interval and  apps.updated > date_trunc('month', $1::timestamptz))
      )
  ) a
order by organization, app, space;
