CREATE OR REPLACE FUNCTION drop_all_functions(schemas TEXT[])
RETURNS TABLE(dropped_function TEXT) AS $$
DECLARE
    schema TEXT;
    function_name TEXT;
    argument_list TEXT;
    drop_query TEXT;
    dropped_functions TEXT[] := '{}';
BEGIN
    FOREACH schema IN ARRAY schemas LOOP
        FOR function_name, argument_list IN
            SELECT routine_name, pg_catalog.pg_get_function_identity_arguments(p.oid)
            FROM information_schema.routines AS r
            JOIN pg_catalog.pg_proc AS p
            ON r.specific_name = p.proname || '_' || p.oid
            WHERE r.routine_type = 'FUNCTION'
            AND r.routine_schema = schema 
        LOOP
            drop_query := 'DROP FUNCTION ' || quote_ident(schema) || '.' || quote_ident(function_name) || '(' || argument_list || ')' || ' CASCADE';
            EXECUTE drop_query;
            dropped_functions := array_append(dropped_functions, schema || '.' || function_name || '(' || argument_list || ')');
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(dropped_functions) AS dropped_function;
END;
$$ LANGUAGE plpgsql;