CREATE OR REPLACE FUNCTION drop_column_constraints(schemas TEXT[])
RETURNS TABLE(modified_column TEXT) AS $$
DECLARE
    schema TEXT;
    tablename TEXT;
    columnname TEXT;
    alter_query TEXT;
    modified_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH schema IN ARRAY schemas LOOP
        FOR tablename, columnname IN
            WITH cols AS (
                SELECT c.table_name, c.column_name
                  FROM information_schema.columns c
                  JOIN information_schema.tables t
                    ON c.table_name = t.table_name
                   AND c.table_schema = t.table_schema
                 WHERE t.table_schema = schema
                   AND (
                       c.is_nullable = 'NO'
                    OR c.column_default IS NOT NULL
                   )
            )
            SELECT cols.table_name, cols.column_name
              FROM cols
             WHERE NOT EXISTS (
                   SELECT 1
                     FROM information_schema.key_column_usage kcu
                     JOIN information_schema.table_constraints tc
                       ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                      AND tc.table_name = kcu.table_name
                    WHERE kcu.table_schema = schema
                      AND kcu.table_name = cols.table_name
                      AND kcu.column_name = cols.column_name
                      AND tc.constraint_type = 'PRIMARY KEY'
             )
        LOOP
            -- Remove NOT NULL constraint if it exists
            IF EXISTS (
                SELECT 1 
                  FROM information_schema.columns 
                 WHERE table_schema = schema 
                   AND table_name = tablename 
                   AND column_name = columnname 
                   AND is_nullable = 'NO'
            ) THEN
                alter_query := 'ALTER TABLE ' 
                               || quote_ident(schema) || '.' 
                               || quote_ident(tablename) 
                               || ' ALTER COLUMN ' 
                               || quote_ident(columnname) 
                               || ' DROP NOT NULL';
                EXECUTE alter_query;
            END IF;

            -- Remove DEFAULT value if it exists
            IF EXISTS (
                SELECT 1
                  FROM information_schema.columns
                 WHERE table_schema = schema
                   AND table_name = tablename
                   AND column_name = columnname
                   AND column_default IS NOT NULL
            ) THEN
                alter_query := 'ALTER TABLE ' 
                               || quote_ident(schema) || '.' 
                               || quote_ident(tablename) 
                               || ' ALTER COLUMN ' 
                               || quote_ident(columnname) 
                               || ' DROP DEFAULT';
                EXECUTE alter_query;
            END IF;

            -- Track the modified columns
            modified_columns := array_append(
                modified_columns,
                schema || '.' || tablename || '.' || columnname
            );
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT unnest(modified_columns) AS modified_column;
END;
$$ LANGUAGE plpgsql;