select
  config_var_notes.created,
  config_var_notes.updated,
  config_var_notes.key,
  config_var_notes.description,
  config_var_notes.required
from 
  config_var_notes 
    join apps on config_var_notes.app = apps.app and apps.deleted = false
    join spaces on apps.space = spaces.space and spaces.deleted = false
where
  config_var_notes.deleted = false and config_var_notes.app = $1