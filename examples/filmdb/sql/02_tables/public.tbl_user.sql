CREATE TABLE "public"."tbl_user" (
    -- IDENTIFIERS
    "id" SERIAL,

    -- MAIN FIELDS
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullname" TEXT,

    -- BOOLEANS
    "isactive" BOOLEAN DEFAULT TRUE,

    -- DATES
    "dtcreated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "dtupdated" TIMESTAMP WITH TIME ZONE,
    "dtremoved" TIMESTAMP WITH TIME ZONE,

    -- CONSTRAINTS
    CONSTRAINT "public_tbl_user_email_key" UNIQUE ("email"),

    -- PRIMARY KEY
    PRIMARY KEY ("id")
);