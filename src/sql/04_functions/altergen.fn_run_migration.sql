CREATE OR REPLACE FUNCTION "altergen"."fn_run_pending_migrations"() 
RETURNS VOID AS $$
DECLARE
    v_migration RECORD;
BEGIN
    -- Loop through all migrations that haven't been executed yet
    FOR v_migration IN 
        SELECT id, query 
        FROM altergen.tbl_migrations 
        WHERE dtexecuted IS NULL
        ORDER BY id
    LOOP
        BEGIN
            -- Execute the migration SQL
            EXECUTE v_migration.query;
            
            -- Update the execution timestamp
            UPDATE altergen.tbl_migrations 
            SET dtexecuted = NOW() 
            WHERE id = v_migration.id;
            RAISE NOTICE 'Executed migration: %', v_migration.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error executing migration %: %', v_migration.id, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;