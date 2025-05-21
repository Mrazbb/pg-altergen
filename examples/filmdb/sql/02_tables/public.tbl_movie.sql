-- Now, create the tbl_movie table with a diverse set of columns.
CREATE TABLE "public"."tbl_movie" (

    -- IDENTIFIERS
    "id" SERIAL NOT NULL, -- Autoincrementing four-byte integer, serves as the primary key.
    "movie_uuid" UUID DEFAULT gen_random_uuid() NOT NULL, -- Universally Unique Identifier for the movie, ensuring global uniqueness.
    -- "movie_status" public.type_movie_status_enum DEFAULT 'planned', -- Current status of the movie using the custom ENUM type.
    "external_api_id" TEXT, -- Identifier from an external API (e.g., IMDB ID 'tt1234567', TMDB ID '123').
    "version_srl" BIGSERIAL, -- Autoincrementing eight-byte integer, useful for versioning or optimistic locking. E.g., 1, 2, 3...
    "short_internal_code_char" CHAR(8), -- Fixed-length internal code (e.g., 'MV000001'). Padded with spaces if shorter.

    -- MAIN FIELDS (Descriptive, Content, Ratings, Technical, etc.)

    -- Core Textual Information
    "title" TEXT NOT NULL, -- The main, official title of the movie. Cannot be null.
    "original_title" TEXT, -- Title in its original language, if different from the main title.
    "tagline_varchar" VARCHAR(255), -- A catchy phrase or slogan for the movie (max 255 characters).
    "overview_text" TEXT, -- A comprehensive overview, plot summary, or synopsis of the movie.

    -- Rich Content & Structured Data
    "storyboard_notes_xml" XML, -- Storyboard details, script notes, or other structured data in XML format.
    "cast_crew_details_json" JSON, -- Flexible JSON for storing cast and crew information (less structured, good for initial import/export).
    "technical_specifications_jsonb" JSONB, -- Detailed technical specifications (e.g., camera, sound) in binary JSON format (efficient for querying and indexing).

    -- Classification, Ratings, and Status
    "content_rating_authority" TEXT DEFAULT 'MPA', -- Authority providing the content rating (e.g., 'MPA', 'BBFC', 'FSK').
    "content_rating_value" VARCHAR(15), -- The actual content rating assigned (e.g., 'PG-13', 'R', '12A', '18+').
    "average_user_rating_numeric" NUMERIC(3, 1), -- Average rating from users, e.g., 7.5 (3 digits total, 1 after decimal).
    "critic_review_score_real" REAL, -- Critic review score as a single-precision floating-point number (approx. 7 decimal digits precision).
    "global_popularity_score_float8" DOUBLE PRECISION, -- A global popularity score as a double-precision floating-point number (approx. 15 decimal digits precision).

    -- Numeric & Quantitative Details
    "duration_minutes_smallint" SMALLINT, -- Duration of the movie in minutes (signed two-byte integer, -32768 to +32767).
    "production_budget_bigint" BIGINT, -- Production budget amount (signed eight-byte integer, for very large numbers).
    "box_office_revenue_decimal" DECIMAL(18, 2), -- Gross box office revenue (exact numeric type, 18 total digits, 2 after decimal).
    "episode_or_part_number_int" INTEGER DEFAULT 1, -- Episode number (if a series) or part number (signed four-byte integer).
    "ticket_price_sample_money" MONEY, -- Example ticket price (currency amount, locale-dependent formatting, NUMERIC is often preferred for calculations).

    -- Array Types (Collections of values)
    "genre_tags_text_array" TEXT[], -- An array of genre tags (e.g., {'Action', 'Sci-Fi', 'Thriller'}).
    "actor_ids_integer_array" INTEGER[], -- An array of actor IDs (e.g., {101, 203, 305}).
    "scene_start_times_time_array" TIME WITHOUT TIME ZONE[], -- An array of TIME values for key scene starts (e.g., {'00:15:30', '01:02:00'}).
    "available_subtitle_langs_char_array" CHAR(5)[], -- An array of fixed-length language codes for subtitles (e.g., {'en-US', 'es-ES', 'fr-FR'}).
    "alternative_scores_numeric_array" NUMERIC(4,2)[], -- An array of alternative scores or ratings.

    -- Geospatial & Geometric Data Types
    "studio_headquarters_point" POINT, -- Geographic coordinates (e.g., longitude, latitude) of the main studio. Example: '( -73.985130, 40.758896 )'.
    "primary_filming_area_polygon" POLYGON, -- A polygon representing a significant filming region. Example: '( (0,0), (0,1), (1,1), (1,0) )'.
    "camera_shot_path_lseg" LSEG, -- A line segment representing a camera movement path. Example: '[ (0,0), (10,5) ]'.
    "distribution_map_bounds_box" BOX, -- A rectangular box defining a distribution area on a map. Example: '( (0,0), (100,200) )'.
    "narrative_flow_diagram_path" PATH, -- A geometric path (open or closed) representing, for example, a narrative flow. Example: '[ (0,0), (1,1), (2,0) ]'.
    "local_screening_radius_circle" CIRCLE, -- A circle defining a local screening radius. Example: '< (0,0), 50 >'.

    -- Network Address Types
    "streaming_service_ip_range_cidr" CIDR, -- IP network range for a dedicated streaming service (e.g., '192.168.100.0/24').
    "production_server_ip_inet" INET, -- IP address of a production server (e.g., '203.0.113.45').
    "contact_device_mac_address" MACADDR, -- Example MAC address (Media Access Control) (e.g., '08:00:2b:01:02:03').
    "contact_device_mac_address_eui64" MACADDR8, -- Example MAC address in EUI-64 format (e.g., '08:00:2b:01:02:03:04:05').

    -- Binary Data & Bit Strings
    "poster_thumbnail_binary_bytea" BYTEA, -- Binary data for a small poster image or other binary content.
    "feature_flags_bitmask_bit8" BIT(8), -- Fixed-length 8-bit string for feature flags (e.g., B'10100001').
    "dynamic_content_options_varbit" VARBIT(64), 

    -- Full-Text Search Support
    "searchable_content_tsvector" TSVECTOR, -- Pre-calculated tsvector for efficient full-text search on fields like title, overview.
    "last_user_search_tsquery" TSQUERY, -- Example of storing a user's last search query in tsquery format.
    
    -- Other Specific PostgreSQL Types
    "internal_replication_log_pg_lsn" PG_LSN, -- PostgreSQL Log Sequence Number, for specific replication or advanced logging scenarios.

    -- BOOLEANS
    "is_publicly_released_bool" BOOLEAN DEFAULT FALSE, -- Flag indicating if the movie has been publicly released.
    "is_adult_content_bool" BOOLEAN DEFAULT FALSE, -- Flag indicating if the movie contains adult content.
    "has_subtitles_available_bool" BOOLEAN, -- Flag indicating if subtitles are available (nullable: true, false, or unknown).
    "is_imax_experience_bool" BOOLEAN DEFAULT FALSE, -- Flag indicating if an IMAX version or experience is available.
    "is_record_archived_bool" BOOLEAN DEFAULT FALSE, -- Flag indicating if this movie record is considered archived.

    -- DATES & TIMES (Temporal Fields)
    "official_release_date_date" DATE, -- The official release date of the movie (YYYY-MM-DD).
    "first_screening_utc_timestamp" TIMESTAMP WITHOUT TIME ZONE, -- Timestamp of the first screening, assumed to be UTC (no timezone info stored with the value itself).
    "world_premiere_event_timestamptz" TIMESTAMP WITH TIME ZONE, -- Timestamp of the world premiere event (stores timezone information with the value).
    "typical_daily_showtime_time" TIME WITHOUT TIME ZONE, -- A typical daily show time (e.g., '19:30:00').
    "special_event_start_timetz" TIME WITH TIME ZONE, -- Specific start time for a special event, including timezone (e.g., '20:00:00-05').
    "production_duration_interval" INTERVAL YEAR TO MONTH, -- Duration of the production phase (e.g., '2 years 3 months').
    "rental_window_interval_days" INTERVAL DAY TO SECOND, -- Period for which the movie is available for rental (e.g., '30 days 12:00:00').
    
    -- Audit Timestamps
    "dtcreated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Timestamp (UTC) when the record was created.
    "dtupdated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Timestamp (UTC) when the record was last updated.
    "dtremoved" TIMESTAMP WITH TIME ZONE, -- Timestamp (UTC) for soft deletion, if applicable.

    -- User Tracking (Assuming a "public"."tbl_user" table exists as per provided context)
    "created_by_userid_fk" INTEGER, -- Foreign key to the user who created this record.
    "updated_by_userid_fk" INTEGER, -- Foreign key to the user who last updated this record.

    -- CONSTRAINTS
    PRIMARY KEY ("id"), -- Defines "id" as the primary key for this table.
    UNIQUE ("movie_uuid"), -- Ensures that "movie_uuid" is unique across all records.
    -- UNIQUE ("title", "official_release_date_date"), -- Example: A movie title might be unique for a given release date.

    -- CHECK constraints for data integrity
    CHECK ("average_user_rating_numeric" IS NULL OR ("average_user_rating_numeric" >= 0.0 AND "average_user_rating_numeric" <= 10.0)),
    CHECK ("critic_review_score_real" IS NULL OR ("critic_review_score_real" >= 0.0 AND "critic_review_score_real" <= 100.0)),
    CHECK ("duration_minutes_smallint" IS NULL OR "duration_minutes_smallint" > 0),
    CHECK ("production_budget_bigint" IS NULL OR "production_budget_bigint" >= 0),
    CHECK (char_length("content_rating_value") <= 15), -- Example check on varchar length.

    -- Foreign Key Constraints (assuming "public"."tbl_user" table with an "id" primary key exists)
    CONSTRAINT "fk_tbl_movie_created_by_user" FOREIGN KEY ("created_by_userid_fk") REFERENCES "public"."tbl_user" ("id"),
    CONSTRAINT "fk_tbl_movie_updated_by_user" FOREIGN KEY ("updated_by_userid_fk") REFERENCES "public"."tbl_user"("id") MATCH SIMPLE ON UPDATE CASCADE ON DELETE SET NULL
    
    -- Example of a self-referencing foreign key (e.g., for sequels/prequels)
    -- "sequel_to_movie_id_fk" INTEGER REFERENCES "public"."tbl_movie"("id") ON DELETE SET NULL,
);

-- COMMENTS ON TABLE AND COLUMNS (PostgreSQL supports COMMENT ON ... syntax for documentation)
COMMENT ON TABLE "public"."tbl_movie" IS 'Stores comprehensive information about movies, designed to test and demonstrate a wide variety of PostgreSQL data types and features.';

COMMENT ON COLUMN "public"."tbl_movie"."id" IS 'Serial primary key (auto-incrementing integer) for the movie record.';
COMMENT ON COLUMN "public"."tbl_movie"."movie_uuid" IS 'Universally Unique Identifier (UUID) for the movie, ensuring global uniqueness. Auto-generated if not provided.';
COMMENT ON COLUMN "public"."tbl_movie"."title" IS 'The official, non-null title of the movie.';
COMMENT ON COLUMN "public"."tbl_movie"."overview_text" IS 'A detailed textual overview or plot summary of the movie.';
COMMENT ON COLUMN "public"."tbl_movie"."technical_specifications_jsonb" IS 'Binary JSON (JSONB) field for storing structured technical specifications, optimized for querying.';
COMMENT ON COLUMN "public"."tbl_movie"."average_user_rating_numeric" IS 'Average user rating on a scale (e.g., 0.0 to 10.0). Includes a CHECK constraint for valid range.';
COMMENT ON COLUMN "public"."tbl_movie"."duration_minutes_smallint" IS 'Duration of the movie in minutes, stored as a small integer.';
COMMENT ON COLUMN "public"."tbl_movie"."genre_tags_text_array" IS 'An array of text strings representing the genres associated with the movie.';
COMMENT ON COLUMN "public"."tbl_movie"."studio_headquarters_point" IS 'Geometric POINT type for storing geographic coordinates (e.g., longitude, latitude) of the studio.';
COMMENT ON COLUMN "public"."tbl_movie"."is_publicly_released_bool" IS 'Boolean flag (TRUE/FALSE) indicating if the movie has been publicly released. Defaults to FALSE.';
COMMENT ON COLUMN "public"."tbl_movie"."official_release_date_date" IS 'The specific calendar date (YYYY-MM-DD) of the movie''s official release.';
COMMENT ON COLUMN "public"."tbl_movie"."world_premiere_event_timestamptz" IS 'Timestamp WITH TIME ZONE for the world premiere event, accurately storing date, time, and timezone information.';
COMMENT ON COLUMN "public"."tbl_movie"."production_duration_interval" IS 'INTERVAL type representing the duration of the movie''s production phase (e.g., "2 years 3 months").';
COMMENT ON COLUMN "public"."tbl_movie"."dtcreated" IS 'Timestamp (with timezone, defaulting to UTC) indicating when the movie record was initially created.';
COMMENT ON COLUMN "public"."tbl_movie"."created_by_userid_fk" IS 'Foreign key referencing the ID of the user who created this movie record (from tbl_user).';

-- INDEXES (Typically created after the table for better organization and performance tuning)
-- Example: Basic B-tree indexes for common lookups
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_title_text_pattern" ON "public"."tbl_movie" ("title" text_pattern_ops); -- For LIKE queries on title
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_release_date" ON "public"."tbl_movie" ("official_release_date_date");
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_rating" ON "public"."tbl_movie" ("average_user_rating_numeric");

-- Example: Specialized GIN indexes for arrays, JSONB, and full-text search
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_genres_gin" ON "public"."tbl_movie" USING GIN ("genre_tags_text_array");
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_tech_specs_jsonb_gin" ON "public"."tbl_movie" USING GIN ("technical_specifications_jsonb");
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_search_content_gin" ON "public"."tbl_movie" USING GIN ("searchable_content_tsvector");

-- Example: GiST index for geometric data types
CREATE INDEX IF NOT EXISTS "idx_tbl_movie_studio_location_gist" ON "public"."tbl_movie" USING GIST ("studio_headquarters_point");

-- Note: To use UUID generation like `gen_random_uuid()`, no special extension is needed for modern PostgreSQL versions.
-- For older versions, you might need the `uuid-ossp` extension for `uuid_generate_v4()`.
-- The `tbl_user` table with an `id` primary key is assumed to exist for the foreign key constraints to work.