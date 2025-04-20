CREATE TABLE "altergen"."tbl_migrations" (
    
    -- IDENTIFIERS
    "id" SERIAL,
    "queryid" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "comment" TEXT,

    -- TIMESTAMP
    "dtexecuted" TIMESTAMP,

    PRIMARY KEY ("id")
);
