const fs = require('fs');

function generate (files) {
    let insert_quries = [];
    for (let i = 0; i < files.length; i++) {
        let insert_path = files[ i ];
        let insert_file = fs.readFileSync(insert_path, 'utf8');
        insert_quries.push(insert_file + '\n\n');
    }

    return insert_quries.join('\n -- step \n');
}

module.exports.generate = generate;
