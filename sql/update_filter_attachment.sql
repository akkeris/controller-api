update filter_attachments set 
	attachment_options = $3,
	updated = now()
where 
	filter_attachment = $1 and app = $2
returning *