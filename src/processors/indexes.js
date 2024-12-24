const fs = require('fs');
const path = require('path');
const REG = require('../parsers/regpatterns');
const { fromRoot } = require('../utils/paths');


function generate (files) {
    let output = [];

    output.push(fs.readFileSync(fromRoot('src/sql/drop_all_indexes.sql'), 'utf8'));
    output.push(`SELECT drop_all_indexes(ARRAY[${MAIN.schemas.map(schema => `'${schema.name}'`).join(', ')}]);`);
    output.push(`DROP FUNCTION drop_all_indexes(text[]);`); 

    for (let i = 0; i < files.length; i++) {
        let item = files[ i ];
        let item_file = fs.readFileSync(item, 'utf8');
        
        while ((m = REG.INDEX_LINE_PATTERN.exec(item_file)) !== null) {
            if (m.index === REG.index_line.lastIndex) {
                REG.index_line.lastIndex++;
            }

            output.push(m[0]);
        }

    }

    return output.join('\n--step\n');
}
module.exports = { generate };