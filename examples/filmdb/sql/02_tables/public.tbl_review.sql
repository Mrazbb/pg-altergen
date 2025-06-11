CREATE TABLE "public"."tbl_review" (

    -- IDENTIFIERS
    "id" SERIAL,

    -- MAIN FIELDS
    "userid" INTEGER NOT NULL,
    "movieid" INTEGER NOT NULL,
    "reviewtext" TEXT NOT NULL DEFAULT 'No review text provided.',
    
    -- NUMBERS
    "rating" SMALLINT CHECK ("rating" BETWEEN 0 AND 10),

    -- DATES
    "dtcreated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    CONSTRAINT "public_tbl_review_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user" ("id"),
    CONSTRAINT "public_tbl_review_movieid_fkey" FOREIGN KEY ("movieid") REFERENCES "public"."tbl_movie" ("id"),

    -- PRIMARY KEY
    PRIMARY KEY ("id")
); 