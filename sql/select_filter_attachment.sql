select 
	filter_attachments.filter_attachment, 
	filter_attachments.filter,
	filter_attachments.app,
	filter_attachments.attachment_options,
	filter_attachments.deleted,
	filter_attachments.created_by,
	filter_attachments.created,
	filter_attachments.updated,
	filter_attachments.deleted
from
	filter_attachments 
		join filters on filter_attachments.filter = filters.filter and filters.deleted = false
		join apps on filter_attachments.app = apps.app and apps.deleted = false
where
	filter_attachments.app = $1 and filter_attachments.filter_attachment = $2 and filter_attachments.deleted = false