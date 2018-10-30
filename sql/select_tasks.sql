update tasks set 
    status = 'started', 
    started = now(),
    updated = now()
where 
    task in ( select task from tasks where status = 'pending' and deleted = false order by updated asc limit 1)
returning task, action, reference, status, retries, metadata, result, started, finished