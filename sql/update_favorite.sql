update favorites 
	SET deleted=false, updated=$1
where 
    favorite::varchar(256)=$2
returning *    
