select
  previews.preview,
  previews.source,
  previews.target,
  previews.foreign_key,
  previews.foreign_status_key,
  previews.additional_info,
  previews.app_setup,
  previews.created,
  previews.updated
from
  previews
    join apps as target_app on previews.target = target_app.app and target_app.deleted = false
where
  previews.source = $1 and
  previews.deleted = false