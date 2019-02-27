select
	app_setups.app_setup,
	app_setups.created,
	app_setups.updated,
	apps.app,
	apps.name as app_name,
	spaces.space,
	spaces.name as space_name,
	app_setups.status,
	app_setups.failure_messages,
	app_setups.status_messages,
	app_setups.progress
from 
	app_setups 
		join apps on app_setups.app = apps.app
		join spaces on apps.space = spaces.space
where 
	((apps.name::varchar(128) || '-' || spaces.name::varchar(128)) = $1 or apps.app::varchar(128) = $1) and
  	apps.deleted = false and spaces.deleted = false and
	app_setups.deleted = false