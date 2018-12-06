update releases set 
	scm_metadata = $2
where
	deleted = false and
	release = $1