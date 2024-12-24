categories ( IDENTIFIERS, MAIN FIELDS, NUMBERS, BOOLEANS, DATES, CONSTRAINTS, PRIMARY KEY )

-- BAD:
CREATE TABLE "public"."tbl_channel_message" (
    "channelid" varchar(25),
    "body" text,
    "id" varchar(25) NOT NULL,
    "ispinned" bool DEFAULT FALSE,
    "isrobot" bool DEFAULT FALSE,
    "userid" varchar(25),
    "countupdate" INT2 DEFAULT 0,
    "dtupdated" timestamp,
    "openplatformid" varchar(30),
    "dtcreated" timestamp DEFAULT timezone('utc'::text, now()),
    "ismobile" bool DEFAULT FALSE,
    "isremoved" bool DEFAULT FALSE,
    PRIMARY KEY ("id")
);

-- GOOD:
CREATE TABLE "public"."tbl_channel_message" (

    -- IDENTIFIERS
    "id" text NOT NULL,
    "userid" text,
    "channelid" text,
    "openplatformid" text,

    -- MAIN FIELDS
    "body" text,

    -- NUMBERS
    "countupdate" INT2 DEFAULT 0,

    -- BOOLEANS
    "ismobile" bool DEFAULT FALSE,
    "ispinned" bool DEFAULT FALSE,
    "isremoved" bool DEFAULT FALSE,
    "isrobot" bool DEFAULT FALSE,

    -- DATES
    "dtupdated" timestamp,
    "dtcreated" timestamp DEFAULT timezone('utc'::text, now()),

    -- CONSTRAINTS
    CONSTRAINT ...
    CONSTRAINT ...

    -- PRIMARY KEY
    PRIMARY KEY ("id")
);
