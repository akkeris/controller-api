insert into pipeline_promotions
  (pipeline_promotion, created, updated, pipeline, release, description, user_agent, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, false)