CREATE OR REPLACE FUNCTION drop_all_procedures(schemas TEXT[])
RETURNS TABLE(dropped_procedure TEXT) AS $$
DECLARE
    schema TEXT;
    procedure_name TEXT;
    argument_list TEXT;
    drop_query TEXT;
    dropped_procedures TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH schema IN ARRAY schemas LOOP
        FOR procedure_name, argument_list IN
            SELECT routine_name, pg_catalog.pg_get_function_identity_arguments(p.oid)
            FROM information_schema.routines AS r
            JOIN pg_catalog.pg_proc AS p
            ON r.specific_name = p.proname || '_' || p.oid
            WHERE r.routine_type = 'PROCEDURE'
            AND r.routine_schema = schema
        LOOP
            drop_query := 'DROP PROCEDURE ' || quote_ident(schema) || '.' || quote_ident(procedure_name) || '(' || argument_list || ')' || ' CASCADE';
            EXECUTE drop_query;
            dropped_procedures := array_append(dropped_procedures, schema || '.' || procedure_name || '(' || argument_list || ')');
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(dropped_procedures) AS dropped_procedure;
END;
$$ LANGUAGE plpgsql;