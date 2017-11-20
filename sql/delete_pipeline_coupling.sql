update pipeline_couplings set
  deleted = true,
  updated = now()
where
  pipeline_coupling = $1

