CREATE OR REPLACE FUNCTION "public"."fn_user_status"(
    _id INTEGER,
    _isactive BOOLEAN
) RETURNS VOID AS $$
BEGIN
    UPDATE "public"."tbl_user"
    SET "isactive" = _isactive
    WHERE "id" = _id;
END;
$$ LANGUAGE plpgsql;