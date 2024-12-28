const fs = require('fs');
const path = require('path');
const REG = require('../parsers/regpatterns');
const { fromRoot } = require('../utils/paths');


function generate (files) {
    let drop_indexes = [];
    let create_indexes = [];

    drop_indexes.push(fs.readFileSync(fromRoot('src/sql/drop_all_indexes.sql'), 'utf8'));
    drop_indexes.push(`SELECT drop_all_indexes(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    drop_indexes.push(`DROP FUNCTION drop_all_indexes(text[]);`); 

    for (let i = 0; i < files.length; i++) {
        let item = files[ i ];
        let item_file = fs.readFileSync(item, 'utf8');
        
        while ((m = REG.INDEX_LINE_PATTERN.exec(item_file)) !== null) {
            if (m.index === REG.INDEX_LINE_PATTERN.lastIndex) {
                REG.INDEX_LINE_PATTERN.lastIndex++;
            }

            create_indexes.push(m[0]);
        }

    }

    return { drop_indexes, create_indexes };
}
module.exports = { generate };