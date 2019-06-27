update filter_attachments set 
	options = $4,
	updated = now()
where 
	filter_attachment = $1 and app = $2
returning *