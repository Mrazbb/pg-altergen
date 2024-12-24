/******************************************************************
 * constants.js
 *
 * Central location for common PostgreSQL types and constraints
 * used in generating or parsing SQL.
 ******************************************************************/

// A list of frequently used PostgreSQL data types for matching
const POSTGRES_TYPES = [
    "\\[", "\\]", "bigint", "bigserial", "bit", "bit varying", "boolean", "box", "bytea",
    "character", "character varying", "cidr", "circle", "date", "double precision", "inet",
    "integer", "interval", "json", "jsonb", "line", "lseg", "macaddr", "macaddr8", "money",
    "numeric", "path", "pg_lsn", "pg_snapshot", "point", "polygon", "real", "smallint",
    "smallserial", "serial", "text", "time", "time with time zone", "timestamp",
    "timestamp with time zone", "tsquery", "tsvector", "txid_snapshot", "uuid", "xml",
    "int8", "serial8", "varbit", "bool", "char", "varchar", "float8", "int", "decimal",
    "int4", "float4", "int2", "serial2", "serial4", "timetz", "timestamptz"
];

// Common constraints applied to columns
const POSTGRES_CONSTRAINTS = [
    `NOT NULL`,
    `DEFAULT\\s[\\w\\(\\)'"{}:(),]+`,
    `UNIQUE`,
    `PRIMARY KEY\\s*\\(.*?\\)`
];

module.exports = {
    POSTGRES_TYPES,
    POSTGRES_CONSTRAINTS
}; 