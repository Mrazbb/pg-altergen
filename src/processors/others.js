
const fs = require('fs');
const path = require('path');
const REG = require('../parsers/regpatterns');
const { fromRoot } = require('../utils/paths');

/**
 * Generates combined schema creation SQL from multiple files
 * @param {string[]} files - Array of paths to schema SQL files
 * @returns {string} Combined SQL statements separated by step
*/
function process (type, files) {

    for (const file_path of files) {
        const file = Total.Fs.readFileSync(file_path, 'utf8');

        let name = null;
        let schema = null;
        let dependencies = [];

        let m;  // Declare variable for regex matches
        while ((m = REG.OTHERS_NAMES_PATTERN.exec(file)) !== null) {
            if (m.index === REG.OTHERS_NAMES_PATTERN.lastIndex) {
                REG.OTHERS_NAMES_PATTERN.lastIndex++;
            }
            name = m?.groups?.name?.replace(/"/g, '');
            schema = m?.groups?.schema?.replace(/"/g, '');
        }



        while ((m = REG.OTHERS_DEPENDENCIES_PATTERN.exec(file)) !== null) {

            if (m.index === REG.OTHERS_DEPENDENCIES_PATTERN.lastIndex) {
                REG.OTHERS_DEPENDENCIES_PATTERN.lastIndex++;
            }


            let dep_name = m?.groups?.name?.replace(/"/g, '');
            let dep_schema = m?.groups?.schema?.replace(/"/g, '');
            dep_schema = dep_schema ? dep_schema : 'public';

            let dependency = `${dep_schema}.${dep_name}`;

            if (dependencies.indexOf(dependency) === -1 && dependency !== `${schema}.${name}`) {
                dependencies.push(dependency);
            }
        }


        MAIN[type].push({ name: schema + '.' + name, file_path, dependencies });
    }

    return MAIN[type];
}


function check_dependencies () {
    let created = [];
    let others = CLONE([...MAIN.views, ...MAIN.functions, ...MAIN.procedures]);

    while (others.length > 0) {
        let i = 0;
        let createdinloop = 0; // count of created objects in the loop if 0 then there are missing dependencies
        while (i < others.length) {
            let obj = others[ i ];
            
            let uncreated = obj.dependencies.filter(dep => created.indexOf(dep) === -1);
            if (uncreated.length == 0) {
                created.push(obj.name);
                others.splice(i, 1);
                createdinloop++;
            }
            i++;
        }
        if (createdinloop == 0) {
            console.log('ERROR: Missing dependencies', others);
            // throw new Error('Missing dependencies');
            break;
        }

    }
    return created;
}



function generate () {

    let others = CLONE([...MAIN.views, ...MAIN.functions, ...MAIN.procedures]);

    let created = check_dependencies(others);

    let output = [];

    others = others.sort((a, b) => created.indexOf(a.name) - created.indexOf(b.name));

    for (let i = 0; i < others.length; i++) {    

        let other = others[ i ];
        let other_file = Total.Fs.readFileSync(other.file_path, 'utf8');

        output.push(other_file + STEP_COMMENT);
    }

    return output;
}

function drop () {

    let output = [];

    // DROP VIEWS
    output.push(fs.readFileSync(fromRoot('src/sql/drop_all_views.sql'), 'utf8'));
    output.push(`SELECT drop_all_views(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    output.push(`DROP FUNCTION drop_all_views(text[]);`);

    // DROP FUNCTIONS
    output.push(fs.readFileSync(fromRoot('src/sql/drop_all_functions.sql'), 'utf8'));
    output.push(`SELECT drop_all_functions(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    output.push(`DROP FUNCTION drop_all_functions(text[]);`);

    // DROP PROCEDURES
    output.push(fs.readFileSync(fromRoot('src/sql/drop_all_procedures.sql'), 'utf8'));
    output.push(`SELECT drop_all_procedures(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    output.push(`DROP FUNCTION drop_all_procedures(text[]);`);

    return output;
}

module.exports = { 
    process,
    generate,
    check_dependencies,
    drop
};