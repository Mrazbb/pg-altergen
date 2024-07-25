const REG = require('./regpatterns');
const fs = require('fs');
const path = require('path');



function generate (files) {

    let others_create = [];

    for (let i = 0; i < files.length; i++) {
        let file_path = files[ i ];

        let file = fs.readFileSync(file_path, 'utf8');
        let file_name = path.basename(file_path);
        let split_name = file_name.split('.');
        let schema = split_name[0].replace(/^\d+_/, '');
        let name = split_name[1];

        // if (split_name[1].startsWith('fn')) {
        //     others_create.push(comment);
        // }

        // if (split_name[1].startsWith('view')) {
        //     others_create.push(comment);
        // }

        // if (split_name[1].startsWith('procedure')) {
        //     others_create.push(comment);
        // }

        others_create.push(file);
    }

    // return others_create.join('\n\n');
    return others_create.join('\n' + '-- step' + '\n');

}
module.exports.generate = generate;
