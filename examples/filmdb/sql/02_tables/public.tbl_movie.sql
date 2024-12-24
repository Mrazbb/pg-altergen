CREATE TABLE "public"."tbl_movie" (
    -- IDENTIFIERS
    "id" SERIAL,

    -- MAIN FIELDS
    "title" TEXT NOT NULL,
    "description" TEXT,

    -- DATES
    "dtreleased" TIMESTAMP,
    "dtcreated" TIMESTAMP,
    "dtupdated" TIMESTAMP,
    "dtremoved" TIMESTAMP,

    -- PRIMARY KEY
    PRIMARY KEY ("id")
); 