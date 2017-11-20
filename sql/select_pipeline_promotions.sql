select
  pipeline_promotions.pipeline_promotion,
  pipeline_promotions.created,
  pipeline_promotions.updated,
  pipeline_promotions.release source_release,
  pipeline_promotions.pipeline,
  pipeline_promotions.description,
  pipeline_promotions.user_agent,
  pipeline_promotion_targets.pipeline_promotion_target,
  pipeline_promotion_targets.release target_release,
  pipeline_promotion_targets.app target_app,
  apps.app source_app
from
  pipeline_promotions
  join pipelines on pipeline_promotions.pipeline = pipelines.pipeline
  join releases on pipeline_promotions.release = releases.release
  join apps on releases.app = apps.app
  join pipeline_promotion_targets on pipeline_promotions.pipeline_promotion = pipeline_promotion_targets.pipeline_promotion
where
  releases.deleted = false and
  apps.deleted = false and
  pipeline_promotion_targets.deleted = false and
  pipeline_promotions.deleted = false and
  pipelines.deleted = false