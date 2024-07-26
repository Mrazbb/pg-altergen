CREATE OR REPLACE FUNCTION drop_all_views(schemas TEXT[])
RETURNS TABLE(dropped_view TEXT) AS $$
DECLARE
    schema TEXT;
    view_name TEXT;
    drop_query TEXT;
    dropped_views  TEXT[] := '{}';
BEGIN
    FOREACH schema IN ARRAY schemas LOOP
        FOR view_name IN
            SELECT table_name
            FROM INFORMATION_SCHEMA.views
            WHERE table_schema = schema
        LOOP
            drop_query := 'DROP VIEW ' || quote_ident(schema) || '.' || quote_ident(view_name) || ' CASCADE';
            EXECUTE drop_query;
            dropped_views := array_append(dropped_views, schema || '.' || view_name);
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(dropped_views) AS dropped_view;
END;
$$ LANGUAGE plpgsql;