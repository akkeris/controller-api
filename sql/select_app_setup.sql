select
	app_setups.app_setup,
	app_setups.created,
	app_setups.updated,
	apps.app,
	apps.name,
	app_setups.status,
	app_setups.failure_messages,
	app_setups.status_messages,
	app_setups.progress
from 
	app_setups join apps on app_setups.app = apps.app 
where 
	app_setups.app_setup::varchar(128) = $1::varchar(128)
	and app_setups.deleted = false