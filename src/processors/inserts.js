/**
 * insertcsv.js
 * 
 * Reads semicolon-separated CSV files and generates SQL INSERT statements 
 * to be included in the alter script.  
 *
 * The main function, generate(), scans a specified CSV folder for files, and 
 * converts each file's rows into multi-row INSERT statements. 
 * 
 * Usage within your generateCommand:
 *  1. Call insertcsv.generate() to get an array of SQL statements (strings).
 *  2. Append these statements into your final "alter.sql" output.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_FOLDER = '07_csv';  // Adjust if needed (this is just an example path).

/**
 * Reads a single CSV file (semicolon-separated) and converts it into a list 
 * of INSERT statements for the target table.
 * 
 * @param {string} csvFilePath - Full path to the CSV file.
 * @param {string} tableName - Fully qualified table name (e.g., public.tbl_movie).
 * @returns {Promise<string[]>} - Promise resolving to an array of SQL statements.
 */
function generateInsertStatementsFromCSV(csvFilePath, tableName) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let headers = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv({ separator: ';' }))
            .on('headers', (hdrs) => {
                headers = hdrs.map(h => h.trim());
            })
            .on('data', (data) => {
                const rowData = {};
                headers.forEach((col) => {
                    rowData[col] = data[col] ?? '';
                });
                rows.push(rowData);
            })
            .on('end', () => {
                if (!rows.length) {
                    return resolve([]);
                }

                // convert to array of objects
                let rows2 = rows.map(row => {
                    return headers.map(h => row[h]);
                });
                const inserts = [];
                const chunkSize = 1000;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);

                    let columns = headers.join(', ');
                    let values = chunk.map(row => {
                        let fieldList = headers.map(h => {
                            // Trim the field and check if it is empty
                            let val = (row[h] || '').trim();

                            // Replace empty string with NULL
                            if (!val) {
                                return 'NULL';
                            }
                            // Replace single quotes for SQL safety and quote the value
                            val = val.replace(/'/g, "''");
                            return `'${val}'`;
                        });

                        return `(${fieldList.join(', ')})`;
                    });

                    let pk = MAIN.tables.findItem('name', tableName).primary_keys;
                    let statement = `INSERT INTO ${tableName} (${columns})\n  VALUES\n  ${values.join(',\n  ')} ON CONFLICT (${pk.join(', ')}) DO NOTHING;`;
                    inserts.push(statement);
                }

                resolve(inserts);
            })
            .on('error', (err) => {
                console.error(`Error reading CSV file: ${csvFilePath}`, err);
                reject(err);
            });
    });
}



async function generate(files) {
    let statements = [];


    // files order based on table order
    files = files.sort((a, b) => {
        let nameA = path.basename(a).replace('.csv', '');
        let nameB = path.basename(b).replace('.csv', '');

        let tableA = MAIN.tables.findItem('name', nameA);
        let tableB = MAIN.tables.findItem('name', nameB);
        return tableA.order - tableB.order;
    });


    for (const file_path of files) {

        const base_name = path.basename(file_path).replace('.csv', '');
        const table_name = base_name;

        let fileInserts = [];
        try {
            fileInserts = await generateInsertStatementsFromCSV(file_path, table_name);
        } catch (err) {
            console.error(`Failed to generate inserts for ${table_name}`, err);
        }

        // Each item in fileInserts is a full INSERT statement string
        // We add a "-- step" comment after each statement to match the overall "step" style
        fileInserts.forEach(stmt => {
            statements.push(stmt);
        });
    }

    return statements;
}

module.exports = {
    generate,
    generateInsertStatementsFromCSV
}; 