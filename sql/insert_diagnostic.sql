insert into diagnostics
  (diagnostic, name, space, app, action, result, image, pipeline, transitionfrom, transitionto, timeout, startdelay, slackchannel, command, org)
values
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
 returning *