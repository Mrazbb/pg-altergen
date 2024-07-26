const REG = require('./regpatterns');
const fs = require('fs');
const path = require('path');



function generate (files) {
    let drop = [];
    let create = [];
    // DROP VIEWS
    drop.push(fs.readFileSync(PATH.join(__dirname, 'sql', 'drop_all_views.sql'), 'utf8'));
    drop.push(`SELECT drop_all_views(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    drop.push(`DROP FUNCTION drop_all_views(text[]);`); 

    // DROP FUNCTIONS
    drop.push(fs.readFileSync(PATH.join(__dirname, 'sql', 'drop_all_functions.sql'), 'utf8'));
    drop.push(`SELECT drop_all_functions(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    drop.push(`DROP FUNCTION drop_all_functions(text[]);`);
    
    // DROP PROCEDURES

    for (let i = 0; i < files.length; i++) {
        let file_path = files[ i ];
        let file = fs.readFileSync(file_path, 'utf8');
        create.push(file);
    }
    
    return {create, drop};

}
module.exports.generate = generate;
