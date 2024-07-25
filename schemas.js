const fs = require('fs');
const path = require('path');

function generate (files) {
    let create_schemas = [];
    let comment = '-- step';
    
    
    
    for (let i = 0; i < files.length; i++) {    
        let file = files[ i ];
        let schema_file = fs.readFileSync(file, 'utf8');
        let schema_name = path.basename(file).split('.')[0].replace(/^\d+_/, '');

        MAIN.schemas.push({ name: schema_name, file: schema_file });

        create_schemas.push(schema_file);
        create_schemas.push(comment);
    }

    return create_schemas.join('\n');
}

module.exports.generate = generate;
