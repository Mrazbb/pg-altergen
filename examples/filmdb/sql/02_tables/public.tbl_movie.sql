CREATE TABLE "public"."tbl_movie" (
    -- IDENTIFIERS
    "id" SERIAL,

    -- MAIN FIELDS
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rating" NUMERIC(3, 1),
    "images" TEXT[],

    -- DATES
    "dtreleased" TIMESTAMP,
    "dtcreated" TIMESTAMP,
    "dtupdated" TIMESTAMP,
    "dtremoved" TIMESTAMP,

    -- PRIMARY KEY
    PRIMARY KEY ("id")
); 