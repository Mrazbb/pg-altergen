CREATE OR REPLACE FUNCTION "public"."fn_insert_movie"(
    _title TEXT,
    _description TEXT,
    _dtreleased DATE
)
RETURNS BIGINT AS $$
DECLARE
    new_id BIGINT;
BEGIN
    INSERT INTO "public"."tbl_movie" (title, description, dtreleased)
    VALUES (_title, _description, _dtreleased)
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql; 