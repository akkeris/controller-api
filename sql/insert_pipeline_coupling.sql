insert into pipeline_couplings
  (pipeline_coupling, created, updated, pipeline, app, stage, deleted)
values
  ($1, $2, $3, $4, $5, $6, false)