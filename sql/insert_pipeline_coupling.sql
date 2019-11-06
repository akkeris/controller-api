insert into pipeline_couplings
  (pipeline_coupling, created, updated, pipeline, app, stage, required_status_checks, deleted)
values
  ($1, $2, $3, $4, $5, $6, $7, false)