/******************************************************************
 * regpatterns.js
 *
 * A collection of regular expressions that parse specific patterns
 * in PostgreSQL DDL statements (CREATE TABLE, INDEX, VIEW, etc.).
 ******************************************************************/

const { POSTGRES_TYPES, POSTGRES_CONSTRAINTS } = require('./constants');

/**
 * Matches CREATE TABLE statements, capturing the table name in a named group.
 * Example match: CREATE TABLE "myschema"."mytable" (
 */
const TABLE_NAME_PATTERN = /CREATE\sTABLE\s(?<name>["._a-zA-Z0-9']+)\s?\(/gmi;

/**
 * Matches lines describing an end constraint.
 * Example match: CONSTRAINT "my_constraint_name" FOREIGN KEY (...)
 */
const END_CONSTRAINT_PATTERN = /^\s*(CONSTRAINT\s*"(?<name>\w*)"*.+?),?$/gmi;

/**
 * Matches CREATE [UNIQUE] INDEX statements.
 * Example match: CREATE UNIQUE INDEX idx_name ON "mytable"(column);
 */
const INDEX_LINE_PATTERN = /CREATE\s+(?:UNIQUE)?\s*INDEX.*$/gmi;

/**
 * Build a pattern for columns with repeated constraints. We allow up to 10
 * constraints in a single column definition (to keep it flexible).
 */
let repeatedConstraints = '';
for (let i = 0; i < 10; i++) {
    repeatedConstraints += `(?<constrain${i}>${POSTGRES_CONSTRAINTS.join('|')})?\\s?`;
}

/**
 * A single compiled pattern to match column definitions:
 *
 * Example lines matched:
 * "id" bigint NOT NULL,
 * "title" character varying(255) DEFAULT 'Untitled',
 */
const TABLE_COLUMN_PATTERN = new RegExp(
    `^[ \\t]*"(?<name>\\w+)"\\s+` +                // capture the column name
    `((?<type>(${POSTGRES_TYPES.sort((a, b) => b.length - a.length).join('|')})` + // capture the data type
    `(\\(.+\\))?)(\\(\\d\\))?(?:\\[\\])*)` + 
    `(?:[ \\t]+(?<constraints>.+?))?[ \\t]*(?:,[ \\t]*)?(?:--.*)?[ \\t]*$`,
    'gmi'
);

/**
 * Matches table
 * Example match: CONSTRAINT , CHECK (foo>0), UNIQUE (foo,bar)  
 */
const TABLE_CONSTRAINT_PATTERN = /^\s*(CONSTRAINT\s*"(?<name>\w*)"*.+?),?$/gmi;

/**
 * Matches primary key definitions, capturing the columns inside the parentheses.
 * Example match: PRIMARY KEY("id","another_col")
 */
const PRIMARY_KEY_NEWLINE_PATTERN = /^\s*PRIMARY\sKEY\s*\((?<columns>.+?)\)\s*$/gmi;

/**
 * Matches foreign key definitions, capturing the local key, reference schema, reference table, and reference key.
 * Example match: CONSTRAINT "public_tbl_review_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user" ("id")
 */
// CONSTRAINT "public_tbl_review_movieid_fkey" FOREIGN KEY ("movieid") REFERENCES "public"."tbl_movie" ("id", "isactive"),

const FOREIGN_KEY_PATTERN = /CONSTRAINT\s+"(?<name>[^"]+)"\s+FOREIGN\s+KEY\s*\(\s*"(?<local_key>[^"]+)"\s*\)\s+REFERENCES\s+"(?<schema>[^"]+)"\."(?<table>[^"]+)"\s*\(\s*(?<keys>.*)\)/gmi;

/**
 * Matches CREATE [OR REPLACE] (FUNCTION|PROCEDURE|VIEW) statements, capturing
 * the schema and object name. Example match:
 * CREATE OR REPLACE FUNCTION "myschema"."fn_something"(...)
 */
const OTHERS_NAMES_PATTERN =
    /CREATE\s+(?:OR\s+REPLACE\s*)|(FUNCTION|PROCEDURE|VIEW)\s+"?(?<schema>[\w]*)?"?\.?"?(?<name>(fn|view|sp)_[\w]+)"?\s?(\(|AS)/gmi;

/**
 * Matches references to function/view/procedure calls within the file for
 * dependency tracking. Example match: myschema.fn_something
 */
const OTHERS_DEPENDENCIES_PATTERN =
    /("?(?<schema>[\w]*)?"?\.?)?"?(?<name>(?<=^|[ ."])(fn|view|sp)_[\w]+)"?/gmi;

// Export each pattern with clear naming
module.exports = {
    TABLE_NAME_PATTERN,
    END_CONSTRAINT_PATTERN,
    INDEX_LINE_PATTERN,
    TABLE_COLUMN_PATTERN,
    PRIMARY_KEY_NEWLINE_PATTERN,
    FOREIGN_KEY_PATTERN,
    OTHERS_NAMES_PATTERN,
    OTHERS_DEPENDENCIES_PATTERN,
    TABLE_CONSTRAINT_PATTERN
};

