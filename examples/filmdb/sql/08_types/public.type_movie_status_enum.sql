-- First, define any custom types if needed. For example, an ENUM for movie status.
CREATE TYPE "public"."type_movie_status_enum" AS ENUM (
    'unknown',
    'rumored',
    'planned',
    'in_production',
    'post_production',
    'released',
    'cancelled',
    'on_hold'
);