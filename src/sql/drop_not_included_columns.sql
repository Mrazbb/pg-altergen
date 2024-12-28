CREATE TYPE schema_table_inclusion AS (
    schema_name  TEXT,
    table_name   TEXT,
    included_cols TEXT[]
);

CREATE OR REPLACE FUNCTION drop_not_included_columns_for_all(
    table_data schema_table_inclusion[]
)
RETURNS SETOF TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    row          schema_table_inclusion;
    col          RECORD;
    drop_sql     TEXT;

    this_schema  TEXT;
    schema_list  TEXT[];
    tbl          RECORD;

    -- We'll build a temporary table -> array relationship
    -- to quickly check if a schema.table is in the array.
    table_map    TEXT[] := '{}';  -- Will store entries like "schema.table"
BEGIN
    ------------------------------------------------------------------
    -- 1) Collect all relevant schemas and build a set of "schema.table"
    ------------------------------------------------------------------
    -- Convert all (schema_name, table_name) pairs into an array of strings
    -- for easy searching. Also gather a distinct list of schema names.
    FOREACH row IN ARRAY table_data
    LOOP
        table_map := array_append(table_map, row.schema_name || '.' || row.table_name);
    END LOOP;

    -- Grab distinct schema names from the input array.
    SELECT array_agg(DISTINCT schema_name)
    INTO schema_list
    FROM unnest(table_data) AS row;

    ------------------------------------------------------------------
    -- 2) For each schema in schema_list, find all tables and see
    --    if they are in the table_map. If not -> Drop the table.
    ------------------------------------------------------------------
    FOREACH this_schema IN ARRAY schema_list
    LOOP
        FOR tbl IN 
            SELECT tablename 
            FROM pg_catalog.pg_tables
            WHERE schemaname = this_schema
        LOOP
            IF (this_schema || '.' || tbl.tablename) != ALL(table_map) THEN
                -- This table not in our input array -> generate drop table statement
                drop_sql := 'DROP TABLE '
                            || quote_ident(this_schema)
                            || '.'
                            || quote_ident(tbl.tablename)
                            || ' CASCADE;';
                RETURN NEXT drop_sql;
            END IF;
        END LOOP;
    END LOOP;

    ------------------------------------------------------------------
    -- 3) For each “included” table in our array, drop columns
    --    that are not in included_cols
    ------------------------------------------------------------------
    FOREACH row IN ARRAY table_data
    LOOP
        FOR col IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = row.schema_name
              AND table_name   = row.table_name
              AND column_name NOT IN (
                  SELECT unnest(row.included_cols)
              )
        LOOP
            drop_sql := 'ALTER TABLE '
                        || quote_ident(row.schema_name)
                        || '.'
                        || quote_ident(row.table_name)
                        || ' DROP COLUMN '
                        || quote_ident(col.column_name)
                        || ';';

            RETURN NEXT drop_sql;
        END LOOP;
    END LOOP;

    RETURN;
END;
$$; 


-- sample call
-- SELECT * FROM drop_not_included_columns_for_all( ARRAY[('public','tbl_user',ARRAY['id','name','email'])::schema_table_inclusion]::schema_table_inclusion[]);

