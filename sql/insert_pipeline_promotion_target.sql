insert into pipeline_promotion_targets
  (pipeline_promotion_target, created, updated, pipeline_promotion, release, app, deleted)
values
  ($1, $2, $3, $4, $5, $6, false)