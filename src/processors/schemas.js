/**
 * Generates combined schema creation SQL from multiple files
 * @param {string[]} files - Array of paths to schema SQL files
 * @returns {string} Combined SQL statements separated by step
*/

const path = require('path');

function process (files) {

    for (let i = 0; i < files.length; i++) {    
        let file = files[ i ];
        let schema_file = Total.Fs.readFileSync(file, 'utf8');
        let schema_name = path.basename(file).split('.')[0].replace(/^\d+_/, '');

        MAIN.schemas.push({ name: schema_name, file_path: file });
    }

    return MAIN.schemas;
}


function generate (files) {
    let create_schemas = [];
    let schemas = MAIN.schemas; 

    for (let i = 0; i < schemas.length; i++) {    

        let schema = schemas[ i ];
        let schema_file = Total.Fs.readFileSync(schema.file_path, 'utf8');

        create_schemas.push(schema_file + STEP_COMMENT);
    }

    return create_schemas;
}

module.exports = { 
    process,
    generate
};