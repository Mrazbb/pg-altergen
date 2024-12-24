CREATE OR REPLACE FUNCTION drop_all_indexes(schemas TEXT[])
RETURNS TABLE(dropped_index TEXT) AS $$
DECLARE
    schema TEXT;
    tblname TEXT;
    idxname TEXT;
    drop_query TEXT;
    dropped_indexes TEXT[] := '{}';
BEGIN
    FOREACH schema IN ARRAY schemas LOOP
        FOR tblname, idxname IN
            SELECT i.tablename, i.indexname
            FROM pg_indexes i
            LEFT JOIN pg_constraint c ON c.conname = i.indexname AND c.contype = 'p'
            WHERE i.schemaname = schema AND c.conname IS NULL
        LOOP
            drop_query := 'DROP INDEX ' || quote_ident(schema) || '.' || quote_ident(idxname);
            EXECUTE drop_query;
            dropped_indexes := array_append(dropped_indexes, schema || '.' || tblname || ' - ' || idxname);
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(dropped_indexes) AS dropped_index;
END;
$$ LANGUAGE plpgsql;
