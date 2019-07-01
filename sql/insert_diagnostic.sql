insert into diagnostics
  (diagnostic, name, jobspace, app, action, result, image, pipeline, transitionfrom, transitionto, timeout, startdelay, slackchannel, command)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
 returning *