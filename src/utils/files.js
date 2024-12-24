const fs = require('fs');
const path = require('path');
const sql_directory = path.join(__dirname, '../sql');

function listfiles (type, sourcetype='source_dir', uniquename=false) {
    // source (source_dir, additionalsource_dirs, all) 

    var dirs = [];
    
    var files = [];
    // source directories
    if ( sourcetype === 'source_dir') { // only source directory
        dirs = [ config[ 'source_dir' ] ];

    } else if (sourcetype === 'additionalsource_dirs') { // additional source directories
        dirs = config['additionalsource_dirs'];

    } else if (sourcetype === 'all') { // all source directories
        dirs = [ config[ 'source_dir' ] ].concat(config['additionalsource_dirs']);

    } else {
        throw new Error('Invalid source type: ' + sourcetype);
    }
    
    
    let items = null; 
    let directory = null;
    
    for (let dir of dirs) {

        if(fs.existsSync(dir)) {

            let folder = SQL_OBJECT_TYPES[type];

            if (folder === undefined) {
                throw new Error('Invalid type: ' + type);
            }

            directory = path.join(dir, folder);

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
    
    // remove duplicates base on file name and keep the last one
    files = files.reverse().filter((file, index, self) => {
        return self.findIndex(t => t.includes(path.basename(file))) === index;
    });

    return files;
}





module.exports.listfiles = listfiles;
