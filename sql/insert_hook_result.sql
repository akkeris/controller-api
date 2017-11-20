insert into hook_results 
  (hook_result, hook, events, url, response_code, response_headers, response_body, payload_headers, payload_body, created, deleted)
values 
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), false)
returning *