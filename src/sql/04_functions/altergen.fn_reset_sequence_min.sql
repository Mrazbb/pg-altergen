CREATE OR REPLACE FUNCTION "altergen"."fn_reset_sequence_min"(
    p_schema text,
    p_table text,
    p_column text DEFAULT 'id',
    p_floor bigint DEFAULT 100000
)
RETURNS void AS $$
DECLARE
    v_table     regclass;
    v_seq_text  text;
    v_seq_reg   regclass;
    v_max_id    bigint;
    v_next      bigint;
BEGIN
    -- Build the regclass for the given schema.table
    v_table := format('%I.%I', p_schema, p_table)::regclass;

    -- Find the sequence linked to the column
    SELECT pg_get_serial_sequence(v_table::text, p_column)
      INTO v_seq_text;

    IF v_seq_text IS NULL THEN
        RAISE NOTICE 'No sequence is linked to %.% — nothing to do.', v_table::text, p_column;
        RETURN;
    END IF;

    v_seq_reg := v_seq_text::regclass;

    -- Get max(column)
    EXECUTE format(
        'SELECT COALESCE(MAX(%I), 0) FROM %s',
        p_column,
        v_table::text
    )
    INTO v_max_id;

    -- Calculate next value
    v_next := GREATEST(v_max_id + 1, p_floor);

    -- Reset the sequence so next nextval() returns v_next
    PERFORM setval(v_seq_reg, v_next, false);

    RAISE NOTICE 'Sequence % reset: next value will be % (max(%)=%).',
        v_seq_text, v_next, p_column, v_max_id;
END;
$$ LANGUAGE plpgsql;
