CREATE OR REPLACE FUNCTION drop_all_foreign_keys(schemas TEXT[])
RETURNS TABLE(dropped_constraint TEXT) AS $$
DECLARE
    schema TEXT;
    tablename TEXT;
    constraint_name TEXT;
    drop_query TEXT;
    dropped_constraints TEXT[];
BEGIN
    FOREACH schema IN ARRAY schemas LOOP
        FOR tablename, constraint_name IN
            SELECT table2.tablename, cons.conname
            FROM pg_catalog.pg_tables table2 
            LEFT JOIN pg_catalog.pg_class t ON t.relname = table2.tablename
            LEFT JOIN pg_catalog.pg_constraint cons ON t.oid = cons.conrelid
            WHERE table2.schemaname = schema AND cons.contype = 'f'
        LOOP
            drop_query := 'ALTER TABLE ' || quote_ident(schema) || '.' || quote_ident(tablename) || ' DROP CONSTRAINT ' || quote_ident(constraint_name);
            EXECUTE drop_query;
            dropped_constraints := array_append(dropped_constraints, schema || '.' || tablename || ' - ' || constraint_name);
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(dropped_constraints) AS dropped_constraint;
END;
$$ LANGUAGE plpgsql;