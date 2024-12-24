CREATE OR REPLACE FUNCTION "public"."fn_insert_review"(
    _userid INTEGER,
    _movieid INTEGER,
    _reviewtext TEXT,
    _rating INTEGER
)
RETURNS BIGINT AS $$
DECLARE
    new_id BIGINT;
BEGIN
    INSERT INTO "public"."tbl_review" (userid, movieid, reviewtext, rating)
    VALUES (_userid, _movieid, _reviewtext, _rating)
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql; 