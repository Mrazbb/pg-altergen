-- Recommended content for your drop_all_functions.sql file
CREATE OR REPLACE FUNCTION drop_all_functions(target_schemas TEXT[])
RETURNS TABLE(dropped_function_signature TEXT) AS $$
DECLARE
    sch TEXT;
    func_record RECORD;
    v_drop_query TEXT;
    v_dropped_functions_list TEXT[] := '{}';
BEGIN
    FOREACH sch IN ARRAY target_schemas LOOP
        FOR func_record IN
            SELECT
                p.proname AS function_name,
                pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_list,
                n.nspname AS function_schema
            FROM
                pg_catalog.pg_proc p
            JOIN
                pg_catalog.pg_namespace n ON n.oid = p.pronamespace
            WHERE
                n.nspname = sch
                AND p.prokind = 'f' -- 'f' for normal functions. Use 'p' for procedures, 'a' for aggregates if needed.
                -- Exclude functions that are part of an extension
                AND NOT EXISTS (
                    SELECT 1
                    FROM pg_catalog.pg_depend d
                    WHERE d.classid = 'pg_catalog.pg_proc'::regclass
                      AND d.objid = p.oid
                      AND d.deptype = 'e' -- 'e' for extension dependency
                )
        LOOP
            -- Form the fully qualified function signature for dropping and reporting
            DECLARE
                v_function_signature TEXT := quote_ident(func_record.function_schema) || '.' || quote_ident(func_record.function_name) || '(' || func_record.argument_list || ')';
            BEGIN
                -- Skip dropping this management function itself if it's in the target schemas
                -- (Adjust schema/name if your management functions live elsewhere or have different names)
                IF func_record.function_schema = 'public' AND func_record.function_name = 'drop_all_functions' THEN
                    CONTINUE;
                END IF;
                IF func_record.function_schema = 'public' AND func_record.function_name = 'manage_enum_type' THEN
                    CONTINUE;
                END IF;
                -- Add other management functions to skip here if necessary

                v_drop_query := 'DROP FUNCTION ' || v_function_signature || ' CASCADE';
                RAISE DEBUG 'Executing: %', v_drop_query;
                EXECUTE v_drop_query;
                v_dropped_functions_list := array_append(v_dropped_functions_list, v_function_signature);
            EXCEPTION
                WHEN dependent_objects_still_exist THEN
                    RAISE WARNING 'Could not drop function % due to dependent objects (even with CASCADE): %',
                        v_function_signature, SQLERRM;
                WHEN OTHERS THEN
                    RAISE WARNING 'Error dropping function %: %',
                        v_function_signature, SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(v_dropped_functions_list);
END;
$$ LANGUAGE plpgsql;