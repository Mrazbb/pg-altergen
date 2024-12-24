CREATE OR REPLACE PROCEDURE "public"."sp_update_review"(
    _reviewid INTEGER,
    _newreviewtext TEXT,
    _newrating INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "public"."tbl_review"
       SET reviewtext = _newreviewtext,
           rating      = _newrating
    WHERE id = _reviewid;
END;
$$; 