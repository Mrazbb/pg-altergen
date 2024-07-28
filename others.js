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
    // 
    // create dependency graph
    for (let i = 0; i < files.length; i++) {

        let name = null;
        let schema = null;
        let dependencies = [];
    
        let file_path = files[ i ];
        let file = fs.readFileSync(file_path, 'utf8');

        while ((m = REG.others_names.exec(file)) !== null) {
            if (m.index === REG.others_names.lastIndex) {
                REG.others_names.lastIndex++;
            }
            name = m?.groups?.name?.replace(/"/g, '');
            schema = m?.groups?.schema?.replace(/"/g, '');
        }

        while ((m = REG.others_dependencies.exec(file)) !== null) {

            if (m.index === REG.others_dependencies.lastIndex) {
                REG.others_dependencies.lastIndex++;
            }
            let dep_name = m?.groups?.name?.replace(/"/g, '');
            let dep_schema = m?.groups?.schema?.replace(/"/g, '');
            dep_schema = dep_schema ? dep_schema : 'public';

            let dependency = `${dep_schema}.${dep_name}`;

            if (dependencies.indexOf(dependency) === -1 && dependency !== `${schema}.${name}`) {
                dependencies.push(dependency);
            }
        }
        
        if (MAIN.others.findIndex('name', name) === -1) {
            MAIN.others.push({ name: `${schema}.${name}`, dependencies, file_path });
        }
    }
    
    // create others
    let created = [];
    let others = CLONE(MAIN.others);
    while (others.length > 0) {
        let i = 0;
        let createdinloop = 0;
        while (i < others.length) {
            let obj = others[ i ];
            
            let uncreated = obj.dependencies.filter(dep => created.indexOf(dep) === -1);
            if (uncreated.length == 0) {
                let file = fs.readFileSync(obj.file_path, 'utf8');
                create.push(file);
                created.push(obj.name);
                others.splice(i, 1);
                createdinloop++;
            }
            i++;
        }
        if (createdinloop == 0) {
            console.log('ERROR: Missing dependencies', others);
            break;
        }

    }


    return {create, drop};

}
module.exports.generate = generate;
