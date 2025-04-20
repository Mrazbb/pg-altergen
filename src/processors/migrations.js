/**
 * migrations.js
 *
 * Processes migration files and inserts them into the altergen.tbl_migrations table
 * with NULL execution dates, allowing them to be executed by altergen.fn_run_pending_migrations().
 * 
 * Migration files can be SQL or CSV with format:
 * - SQL: Plain SQL files with migration statements
 * - CSV: Semicolon-separated with columns: id;query;checksum (checksum optional)
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const crypto = require('crypto');

// Array to store migrations found during scanning

/**
 * Scan a list of files and return a list of migrations
 * 
 * @param {string[]} files - The list of files to scan
 * @returns {Promise<Object[]>} A promise that resolves to a list of migration objects
 */
async function scan(files) {
    let migrations = [];
    for (let file of files) {
        const ext = path.extname(file).toLowerCase();
        const basename = path.basename(file, ext);
        if (ext === '.csv') {
            try {
                let migration = await scanCSV(file);
                migrations.push(migration);
            } catch (err) {
                console.error(`Error reading migration CSV file: ${file}`, err);
            }
        }
    }
    return migrations;
}


/**
 * Scan a CSV file and return a migration object
 * 
 * @param {string} file - The path to the CSV file
 * @returns {Promise<Object>} A promise that resolves to a migration object
 */
async function scanCSV(file) {
    return new Promise((resolve, reject) => {
        
        fs.createReadStream(file)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                const id = data.id || '';
                const query = data.query || '';
                let checksum = data.checksum || '';
                let comment = data.comment || '';
                console.log('comment', comment);
                // Calculate checksum if not provided
                if (!checksum) {
                    checksum = crypto.createHash('md5').update(query).digest('hex');
                }
                
                if (id && query) {
                    resolve({ id, query, checksum, comment });
                } else {
                    reject(new Error(`Invalid migration CSV file: ${file}`));
                }
            })
            .on('error', (err) => {
                reject(new Error(`Error reading migration CSV file: ${file}`, err));
            });
    }); 
}

/**
 * Generate SQL statements for inserting migrations into the tracking table
 * 
 * @returns {Array} Array of SQL insert statements
 */
async function generate(files) {
    let migrations = await scan(files);

    const statements = [];
    
    if (migrations.length > 0) {
        
        // insert migrations into the tracking table
        migrations.forEach(migration => {
            const insertStmt = `
                -- Register migration: ${migration.id}
                INSERT INTO altergen.tbl_migrations (queryid, query, checksum, comment, dtexecuted)
                VALUES ('${migration.id}', $migration_sql$${migration.query}$migration_sql$, '${migration.checksum}', '${migration.comment}', NULL)
                ON CONFLICT (queryid) DO NOTHING;
            `;
            statements.push(insertStmt);
        });

        // run pending migrations at the end of the migration process
        statements.push(`
            -- Run the pending migrations at the end of the migration process
            SELECT altergen.fn_run_pending_migrations();
        `);
        
    }
    
    return statements;
}

module.exports = {
    process,
    generate
};