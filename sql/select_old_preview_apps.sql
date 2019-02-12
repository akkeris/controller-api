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
    join spaces on target_app.space = spaces.space and spaces.deleted = false
where
  previews.created < now() - interval '7 days'                    -- We allow up to 5 business days, or 7 calendar days.
  and previews.created - target_app.created < interval '2 minute' -- Safety measure, we expect the preview record to be created around the time of
                                                                  -- the app as well, if they're not we know something has happened. This ensures
                                                                  -- if something mucks up and puts a wrong record in this table it doesnt nuke an
                                                                  -- app on accident.
  and previews.deleted = false