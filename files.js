const fs = require('fs');
const path = require('path');
const sql_directory = path.join(__dirname, '../sql');

function listfiles (type, sourcetype='sourceDir',uniquename=false) {
    // source (sourceDir, additionalSourceDirs, all) 
    var dirs = [];
    
    var files = [];
    // source directories
    if ( sourcetype === 'sourceDir') {
        dirs = [ config[ 'sourceDir' ] ];
    } else if (sourcetype === 'additionalSourceDirs') {
        dirs = config['additionalSourceDirs'];
    } else if (sourcetype === 'all') {
        dirs = [ config[ 'sourceDir' ] ].concat(config['additionalSourceDirs']);
    }
    



    let items = null; 
    let directory = null;
    
    for (let dir of dirs) {

        if(fs.existsSync(dir)) {
            switch (type) {
                case 'schemas':
                    directory = path.join(dir, '01_schemas'); 
                    if(!fs.existsSync(directory)) {
                        continue;
                    }
                    items = fs.readdirSync(directory);

                    for (let item of items) {
                        // TODO unique name of file not path
                        files.push(path.join(dir, '01_schemas', item));
                    }
                    break;
                    
                case 'tables':
                    directory = path.join(dir, '02_tables');
                    if (!fs.existsSync(directory)) {
                        continue;
                    }
                    items = fs.readdirSync(directory);

                    for (let item of items) {
                        // TODO unique name of file not path
                        files.push(path.join(dir, '02_tables', item));
                    }
                    break;
                    
                case 'others':
                    directory = path.join(dir, '03_others');
                    if (!fs.existsSync(directory)) {
                        continue;
                    }
                    items = fs.readdirSync(directory);

                    for (let item of items) {
                        files.push(path.join(dir, '03_others', item));
                    }
                    break;
                case 'inserts':
                    directory = path.join(dir, '06_inserts');
                    if (!fs.existsSync(directory)) {
                        continue;
                    }
                    items = fs.readdirSync(directory);
                    for (let item of items) {
                        files.push(path.join(dir, '06_inserts', item));
                    }

            }
        }

    } 



    // filter sql
    files = files.filter(file => file.match(/\.sql$/));
    files.sort();
    return files;
}
module.exports.listfiles = listfiles;
