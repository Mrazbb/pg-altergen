const table_name = /CREATE\sTABLE\s(?<name>["._a-zA-Z0-9']+)\s?\(/gmi;

const end_constraint = /^\s*(CONSTRAINT\s*"(?<name>\w*)"*.+?),?$/gmi;
const index_line = /CREATE\s+(?:UNIQUE)?\s*INDEX.*$/gmi

const types = ["\\[", "\\]", "bigint", "bigserial", "bit", "bit varying", "boolean", "box", "bytea", "character", "character varying", "cidr", "circle", "date", "double precision", "inet", "integer", "interval", "json", "jsonb", "line", "lseg", "macaddr", "macaddr8", "money", "numeric", "path", "pg_lsn", "pg_snapshot", "point", "polygon", "real", "smallint", "smallserial", "serial", "text", "time", "time with time zone", "timestamp", "timestamp with time zone", "tsquery", "tsvector", "txid_snapshot", "uuid", "xml", "int8", "serial8", "varbit", "bool", "char", "varchar", "float8", "int", "decimal", "int4", "float4", "int2", "serial2", "serial4", "timetz", "timestamptz"];
const constraints = [`NOT NULL`, `DEFAULT\\s[\\w\\(\\)'"{}:(),]+`, `UNIQUE`, `PRIMARY KEY\\s*\\(.*?\\)`]
const regex_types = types.join('|');
const regex_constraints2 = constraints.join('|');
const primary_key_newline = /^\s*PRIMARY\sKEY\s*\((?<columns>.+?)\)\s*$/gmi;

let regex_constraints = '';
for (let i = 0; i < 10; i++) {
    regex_constraints += `(?<constrain${i}>${regex_constraints2})?\\s?`
}
let regex_columns = new RegExp(`^\\s*"(?<name>\\w+)"\\s+((?<type>(${regex_types})+(\\(.+\\))?)(\\(\\d\\))?)\\s*${regex_constraints},\\W*?$`, 'gmi');

// others
const others_names = /CREATE\s+(?:OR\s+REPLACE\s*)|(FUNCTION|PROCEDURE|VIEW)\s+"?(?<schema>[\w]*)?"?\.?"?(?<name>(fn|view|procedure)_[\w]+)"?\s?(\(|AS)/gmi;
const others_dependencies = /"?(?<schema>[\w]*)?"?\.?"?(?<name>(fn|view|procedure)_[\w]+)"?/gmi

module.exports = {
    table_name,
    regex_columns,
    end_constraint,
    primary_key_newline,
    index_line,
    others_names,
    others_dependencies
};