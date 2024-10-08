const REG = require('./regpatterns');
const fs = require('fs');


function generate (files) {
    let out_tables = [];
    let out_columns = [];
    let out_primary_keys = [];
    let out_constraints = []; 
    let out_end_constraints = [];
    for (let file of files) {

        let columns = {};
        let data = fs.readFileSync(file, 'utf8');
        let table_name = null; 
        let primary_key = [];
        let create_table = false;

        
        while ((m = REG.table_name.exec(data)) !== null) {
            if (m.index === REG.table_name.lastIndex) {
                REG.table_name.lastIndex++; 
            }
            table_name = m?.groups?.name;    
        }


        if (!table_name)
            continue;
       
        if (MAIN.tables.findIndex('name', table_name) === -1) {
            MAIN.tables.push({ name: table_name }); 
            create_table = true;
        }

        let table = MAIN.tables.findItem('name', table_name);

        
        // primary key
        while ((m = REG.primary_key_newline.exec(data)) !== null) {
            if (m.index === REG.primary_key_newline.lastIndex) {
                REG.primary_key_newline.lastIndex++;
            }
            if (m?.groups?.columns) {
                primary_key = m.groups.columns.replaceAll('"', '').split(',').map(col => col.trim());                
            }
        }
        
        let short_table_name = table_name.replaceAll('"', '').split('.').pop();
        if (table_name && primary_key.length > 0) {
            out_primary_keys.push(`SELECT create_constraint_if_not_exists('${short_table_name}', '${short_table_name}_pkey', 'ALTER TABLE ${table_name} ADD PRIMARY KEY (${primary_key.map(col => `"${col}"`).join(', ')});');`);
        }

        table[ 'columns' ] = table[ 'columns' ] || [];
        

        // columns
        while ((m = REG.regex_columns.exec(data)) !== null) {
            let name = m?.groups?.name;
            let type = m?.groups?.type;

            if (table[ 'columns' ].findIndex('name', name) === -1) {
                table[ 'columns' ].push({ name, type });
            } else {
                continue;
            }
            
            columns[name] = type;
            out_columns.push(`ALTER TABLE ${table_name} ADD COLUMN IF NOT EXISTS "${name}" ${type};`);
            
            // find constraints
            for (let i = 0; i < 10; i++) {
                if (m.groups[ `constrain${i}` ]) {
                    let con = m?.groups?.[ `constrain${i}` ];
                    out_constraints.push(`ALTER TABLE ${table_name} ALTER COLUMN "${name}" SET ${con};`);
                }
            }
        };

        if (create_table)
            out_tables.push(`CREATE TABLE IF NOT EXISTS ${table_name} (${primary_key.map(col => `"${col}" ${columns[col]}`).join(', ')});`);

        // find constraints
        let end_constraint = '';
        let end_constraint_name = '';
        while ((m = REG.end_constraint.exec(data)) !== null) {

            if (!m.groups) {
                continue;
            }
            
            m.forEach((match, groupIndex) => {
                if (groupIndex === 1) {
                    end_constraint = match;
                }

                if (groupIndex === 2) {
                    end_constraint_name = match;
                }
            });

            out_end_constraints.push(`SELECT create_constraint_if_not_exists('${table_name.replaceAll('"','')}', '${end_constraint_name}', 'ALTER TABLE ${table_name} ADD ${end_constraint}');`);
        }

    };

    let create_constraint_if_not_exists = fs.readFileSync(PATH.join(__dirname, 'sql', 'create_constraint_if_not_exists.sql'), 'utf8') + '\n';

    let create = [
        create_constraint_if_not_exists,
        ...out_tables,
        ...out_columns,
        ...out_primary_keys,
    ];
    
    let drop_constraints = drop_all_constrains();
    
    let constraints = [
        ...out_constraints,
        ...out_end_constraints
    ];


    return {
        create,
        constraints,
        drop_constraints
    };

};


function drop_all_constrains () {
    let output = [];
    let drop_all_foreign_keys = fs.readFileSync(PATH.join(__dirname, 'sql', 'drop_all_foreign_keys.sql'), 'utf8') + '\n'; 
    output.push(drop_all_foreign_keys);
    output.push(`SELECT drop_all_foreign_keys(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    output.push('DROP FUNCTION drop_all_foreign_keys(text[]);');
    return output; 
}

module.exports.generate = generate;