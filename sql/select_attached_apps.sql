select
	apps.name as app_name,
	spaces.name as space_name
from filters
	join filter_attachments on filters.filter = filter_attachments.filter and filter_attachments.deleted = false
	join apps on filter_attachments.app = apps.app and apps.deleted = false
	join spaces on apps.space = spaces.space and spaces.deleted = false
where filters.deleted = false and (filters.name = $1 or filters.filter::varchar(1024) = $1)
