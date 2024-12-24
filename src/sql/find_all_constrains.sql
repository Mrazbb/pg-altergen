


SELECT table2.tablename AS tablename, cons.conname AS constraint_name, cons.contype AS constraint_type FROM pg_catalog.pg_tables table2 
	LEFT JOIN pg_catalog.pg_class t ON t.relname = table2.tablename
	LEFT JOIN pg_catalog.pg_constraint cons ON t.oid = cons.conrelid
	WHERE table2.schemaname='public';