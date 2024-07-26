const fs = require('fs');
const path = require('path');
const sql_directory = path.join(__dirname, '../sql');

function listfiles (type, sourcetype='sourceDir', uniquename=false) {
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
            directory = null
            switch (type) {
                case 'schemas':
                    directory = path.join(dir, '01_schemas');
                    break;
                case 'tables':
                    directory = path.join(dir, '02_tables');
                    break;
                case 'others':
                    directory = path.join(dir, '03_others');
                    break; 
                case 'inserts':
                    directory = path.join(dir, '06_inserts');
                    break;
            } 

            if(!fs.existsSync(directory) || !directory) {
                continue;
            }

            items = fs.readdirSync(directory);
            items.sort();

            for (let item of items) {
                // TODO unique name of file not path
                files.push(path.join(directory, item));
            }

        }

    } 

    // filter sql
    files = files.filter(file => file.match(/\.sql$/));
    return files;
}





module.exports.listfiles = listfiles;
