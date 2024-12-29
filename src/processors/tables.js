const fs = require('fs');
const path = require('path');
const REG = require('../parsers/regpatterns');
const { fromRoot } = require('../utils/paths');

/**
 * Reads and stores table information from SQL files into MAIN.tables.
 * Captures the table name, columns, column-level constraints, primary keys,
 * and table-level constraints (UNIQUE, CHECK, etc.).
 *
 * @param {string[]} files - Paths to the table SQL files
 * @returns {Array} The updated MAIN.tables array
 */
function process(files) {

    for (const file of files) {
        const data = fs.readFileSync(file, 'utf8');
        let name = null;
        let primary_key = [];
        let create_table_needed = false;
        let primary_key_cols = [];

        // 1) Identify the table name
        REG.TABLE_NAME_PATTERN.lastIndex = 0;
        let match;

        while ((match = REG.TABLE_NAME_PATTERN.exec(data)) !== null) {
            name = match?.groups?.name;
        }
        if (!name) {
            continue; // skip if no table name found
        }

        name = name.replaceAll('"', '');

        let name_clean = name.replaceAll('"', '').split('.');
        let schema_name = name_clean[0];
        let table_name = name_clean[1];

        // 2) Check if table is known; otherwise, add it
        if (MAIN.tables.findIndex('name', table_name) === -1) {
            MAIN.tables.push({
                name: name,
                table_name: table_name,
                schema_name: schema_name,
                file_path: file,
                columns: [],
                constraints: [],
                primary_keys: [],
                foreign_keys: [],
                dependencies: []
            });
        }

        const table_meta = MAIN.tables.findItem('name', name);

        // 3) Parse table-level primary key lines (e.g. PRIMARY KEY ("id"))
        REG.PRIMARY_KEY_NEWLINE_PATTERN.lastIndex = 0;
        while ((match = REG.PRIMARY_KEY_NEWLINE_PATTERN.exec(data)) !== null) {
            if (match?.groups?.columns) {
                primary_key_cols = match.groups.columns
                    .replaceAll('"', '')
                    .split(',')
                    .map(col => col.trim());
            }
        }
        table_meta.primary_keys = primary_key_cols;


        // 4) Parse each column definition
        // Expecting name, type, optional constraints
        REG.TABLE_COLUMN_PATTERN.lastIndex = 0;
        let column_match;
        while ((column_match = REG.TABLE_COLUMN_PATTERN.exec(data)) !== null) {
            const col_name = column_match?.groups?.name;
            const col_type = column_match?.groups?.type;
            let col_constraints_raw = column_match?.groups?.constraints || '';
            col_constraints_raw = col_constraints_raw.replace(/\s+$/, '').trim();

            // Skip if column already added
            if (table_meta.columns.findIndex('name', col_name) !== -1) {
                continue;
            }

            const col_constraint_list = parse_column_constraints(col_constraints_raw);

            table_meta.columns.push({
                name: col_name,
                type: col_type,
                constraints: col_constraint_list
            });
        }

        // 5) Parse table-level constraints (e.g. CONSTRAINT uniq_foo UNIQUE (foo))
        REG.TABLE_CONSTRAINT_PATTERN.lastIndex = 0;
        let table_constraint_match;
        while ((table_constraint_match = REG.TABLE_CONSTRAINT_PATTERN.exec(data)) !== null) {

            let constraint_name = table_constraint_match?.groups?.name
            let constraint_def = table_constraint_match[0];

            table_meta.constraints.push({
                name: constraint_name?.trim(),
                definition: constraint_def?.trim()
            });
        }

        // check if primary key is set
        let primary_key_set = false;

        for (const col of table_meta.columns) {
            if (col.constraints.find(constraint => constraint.match(/primary key/i))) {
                primary_key_set = true;
            }
        }

        if (table_meta.primary_keys.length > 0) {
            primary_key_set = true;
        }

        if (!primary_key_set) {
            throw new Error(`No primary key found for table ${table_name} in file ${file}`);
        }


        REG.FOREIGN_KEY_PATTERN.lastIndex = 0;
        let foreign_key_match;
        while ((foreign_key_match = REG.FOREIGN_KEY_PATTERN.exec(data)) !== null) {
            // Parse local and reference keys, handling multiple columns
            let local_keys = foreign_key_match?.groups?.keys
                ?.split(',')
                ?.map(key => key.replaceAll('"', '').trim());
            
            let ref_keys = foreign_key_match?.groups?.keys
                ?.split(',')
                ?.map(key => key.replaceAll('"', '').trim());
            
            let table_name_ref = foreign_key_match?.groups?.table;
            let schema_name_ref = foreign_key_match?.groups?.schema;

            let table_ref = `${schema_name_ref}.${table_name_ref}`;
            if (table_ref !== name) {
                table_meta.dependencies.push(table_ref);
            }
        }
    }

    let dependencies = check_dependencies();
    MAIN.tables.forEach(table => {
        table.order = dependencies.indexOf(table.name);
    });

    return MAIN.tables;
}

/**
 * Helper function that converts raw column constraint text 
 * into an array of separate constraints. For example:
 *   input:  "NOT NULL DEFAULT 'X' CHECK (someCondition)"
 *   output: ["NOT NULL", "DEFAULT 'X'", "CHECK (someCondition)"]
 */
function parse_column_constraints(rawConstraints) {
    if (!rawConstraints) return [];
    // For more complex constraint parsing (like nested parentheses),
    // you may need more robust regex or a small parser:
    const splitRegex = /\b(CHECK\s*\([^)]*\)|DEFAULT\s+[^ ]+|\bNOT NULL\b|PRIMARY KEY|UNIQUE\b)/gi;
    const matches = [];
    let lastIndex = 0;
    let m;

    while ((m = splitRegex.exec(rawConstraints)) !== null) {
        // Add text before the match if it's relevant
        const prefix = rawConstraints.slice(lastIndex, m.index).trim();
        if (prefix) matches.push(prefix);

        matches.push(m[0].trim());
        lastIndex = splitRegex.lastIndex;
    }

    // Add the remainder
    const suffix = rawConstraints.slice(lastIndex).trim();
    if (suffix) matches.push(suffix);

    return matches.filter(str => str.length > 0);
}

/**
 * Generates SQL statements for:
 * 1) CREATE TABLE statements (with primary keys in the definition if desired)
 * 2) ALTER TABLE ADD COLUMN statements for new columns
 * 3) Table-level constraints, e.g., UNIQUE, CHECK
 */
function generate() {

    let create_tables = [];
    let alter_columns = [];
    let table_constraints = [];
    let create_primary_keys = [];

    // Loop over tables in MAIN.tables
    for (const table of MAIN.tables) {
        const { name, table_name, schema_name, columns, constraints, primary_keys } = table;

        // 1) CREATE TABLE (with primary key)
        // Build the column definitions for CREATE TABLE if desired
        // Typically you'd specify columns + primary key

        // CREATE TABLE IF NOT EXISTS without any constraints just column with primary key nothing else
        create_tables.push(
            `CREATE TABLE IF NOT EXISTS ${name} (${primary_keys.map(col => `"${col}" ${columns.find(c => c.name === col).type}`).join(', ')});`
        );

        // 2) ALTER TABLE for columns 
        for (const col of columns) {
            alter_columns.push(
                `ALTER TABLE ${name} ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`
            );
        }

        // 3) Column-level constraints
        for (const col of columns) {
            for (const constraint of col.constraints) {

                if (constraint.startsWith('PRIMARY KEY')) {
                    create_primary_keys.push(`SELECT create_constraint_if_not_exists('${name.replaceAll('"','')}', '${table.schema_name}_${table.table_name}_${col.name}_primary_key', 'ALTER TABLE ${name} ADD CONSTRAINT ${table.schema_name}_${table.table_name}_${col.name}_primary_key PRIMARY KEY (${col.name});');`);

                } else if (constraint.startsWith('UNIQUE')) {
                    table_constraints.push(`SELECT create_constraint_if_not_exists('${name.replaceAll('"','')}', '${table.schema_name}_${table.table_name}_${col.name}_unique', 'ALTER TABLE ${name} ADD CONSTRAINT ${table.schema_name}_${table.table_name}_${col.name}_unique UNIQUE (${col.name});');`);

                } else if (constraint.startsWith('CHECK')) {
                    table_constraints.push(`SELECT create_constraint_if_not_exists('${name.replaceAll('"','')}', '${table.schema_name}_${table.table_name}_${col.name}_check', 'ALTER TABLE ${name} ADD CONSTRAINT ${table.schema_name}_${table.table_name}_${col.name}_check ${constraint};');`);

                } else if (constraint.startsWith('DEFAULT') || constraint.startsWith('NOT NULL')) {
                    table_constraints.push(`ALTER TABLE ${name} ALTER COLUMN "${col.name}" SET ${constraint};`);
                }

            }
        }

        // 4) Table-level constraints
        for (let i = 0; i < constraints?.length; i++) {
            const constraint = constraints[i];
            constraint.definition = constraint.definition.trim().replace(/,$/, '');

            table_constraints.push(`SELECT create_constraint_if_not_exists('${name.replaceAll('"','')}', '${constraint.name}', 'ALTER TABLE ${name} ADD ${constraint.definition}');`);
        }



        // 5) Primary key
        if (primary_keys && primary_keys.length > 0) {    
            create_primary_keys.push(`SELECT create_constraint_if_not_exists('${table_name}', '${table_name}_pkey', 'ALTER TABLE ${schema_name}.${table_name} ADD PRIMARY KEY (${primary_keys.map(col => `"${col}"`).join(', ')});');`);
        }


    }

    const create_constraint_if_not_exists = fs.readFileSync(fromRoot('src/sql/create_constraint_if_not_exists.sql'), 'utf8') + '\n';    
    const drop_function_if_exists = `DROP FUNCTION IF EXISTS create_constraint_if_not_exists(text, text, text);`;

    let drop_table_cons = drop_table_constraints();
    let drop_column_cons = drop_column_constraints();

    let drop_constraints = [
        '\n -- Drop constraints',
        ...drop_table_cons,
        ...drop_column_cons,
    ];

    let create = [
        '\n-- Create constraints',
        create_constraint_if_not_exists,
        '\n-- Create tables',
        ...create_tables,
        '\n-- Alter columns',
        ...alter_columns,
    ];
    
    let constraints = [
        '\n-- Create constraints',
        ...create_primary_keys,
        '\n-- Create table constraints',
        ...table_constraints,
        drop_function_if_exists,
    ];

    return {
        create,
        constraints,
        drop_constraints
    };
}

function drop_table_constraints () {
    let output = [];

    let drop_all_foreign_keys = fs.readFileSync(fromRoot('src/sql/drop_table_constraints.sql'), 'utf8') + '\n';

    output.push(drop_all_foreign_keys);
    output.push(`SELECT drop_table_constraints(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]::text[]);`);
    output.push('DROP FUNCTION drop_table_constraints(text[]);');
    return output; 
}

function drop_column_constraints () {
    let output = [];
    let drop_column_constraints = fs.readFileSync(fromRoot('src/sql/drop_column_constraints.sql'), 'utf8') + '\n';
    output.push(drop_column_constraints);
    output.push(`SELECT drop_column_constraints(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    output.push('DROP FUNCTION drop_column_constraints(text[]);');
    return output; 
}



function check_dependencies () {
    let created = [];
    let tables = CLONE([...MAIN.tables]);

    while (tables.length > 0) {
        let i = 0;
        let createdinloop = 0;
        while (i < tables.length) {
            let obj = tables[ i ];
            
            let uncreated = obj.dependencies.filter(dep => created.indexOf(dep) === -1);
            if (uncreated.length == 0) {
                created.push(obj.name);
                tables.splice(i, 1);
                createdinloop++;
            }

            i++;
        }
        if (createdinloop == 0) {
            console.log('ERROR: Missing dependencies');

            for (const table of tables) {
                let missing =  table.dependencies.filter(dep => created.indexOf(dep) === -1);
                if (missing.length > 0) {
                    console.log(table.name, missing);
                }
            }


            break;
        }

    }

    return created;
}


function drop_not_included_columns () {
    let output = [];
    let drop_not_included_columns = fs.readFileSync(fromRoot('src/sql/drop_not_included_columns.sql'), 'utf8') + '\n';
    output.push(drop_not_included_columns);
    output.push(`SELECT * FROM drop_not_included_columns_for_all(ARRAY[${MAIN.tables.map(item => `('${item.schema_name}','${item.table_name}',ARRAY[${item.columns.map(col => `'${col.name}'`).join(',')}])::schema_table_inclusion`).join(',')}]::schema_table_inclusion[]);`);
    return output.join('\n');
}



module.exports = { 
    process,
    generate,
    drop_not_included_columns
};
