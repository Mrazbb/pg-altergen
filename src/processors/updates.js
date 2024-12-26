/**
 * updates.js
 *
 * Reads semicolon-separated CSV files and generates SQL UPDATE statements 
 * to be included in an "update script".
 *
 * The main function, generate(), scans a specified CSV folder for files, and 
 * converts each file's rows into single-row UPDATE statements.
 *
 * Usage within your generateCommand:
 *  1. Call updatecsv.generate() to get an array of SQL statements (strings).
 *  2. Append these statements into your final "update.sql" output.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Reads a single CSV file (semicolon-separated) and converts it into a list
 * of UPDATE statements for the target table.
 *
 * @param {string} csvFilePath - Full path to the CSV file.
 * @param {string} tableName - Fully qualified table name (e.g., public.tbl_movie).
 * @returns {Promise<string[]>} - Promise resolving to an array of SQL statements.
 */
function generateUpdateStatementsFromCSV(csvFilePath, tableName) {
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

                const updates = [];

                // Retrieve primary key columns from MAIN
                let primary_keys = [];
                const tableMeta = MAIN.tables.findItem('name', tableName);
                if (!tableMeta) {
                    console.warn(`No table metadata found in MAIN for table: ${tableName}.`);
                } else {
                    primary_keys = tableMeta.primary_keys || [];
                }

                rows.forEach(row => {
                    // Build the columns and values for the INSERT
                    const insertColumns = headers.map(h => `"${h}"`).join(', ');
                    const insertValues = headers.map(h => {
                        const val = (row[h] ?? '').replace(/'/g, "''");
                        return `'${val}'`;
                    }).join(', ');
                    // update table set col1 = val1, col2 = val2, ...
                    const update_values = headers.map(h => {
                        const val = `"${h}" = '${row[h]}'`;
                        return val;
                    }).join(', ');

                    // update table set col1 = val1, col2 = val2, ...
                    const updateValues = headers.map(h => {
                        const val = (row[h] ?? '').replace(/'/g, "''");
                        return `"${h}" = '${val}'`;
                    }).join(', ');

                    const updateCondition = primary_keys.length

                    // Build the ON CONFLICT updates (only for non-PK cols)
                    const onConflictUpdates = headers
                        .filter(h => !primary_keys.includes(h))
                        .map(h => `"${h}" = EXCLUDED."${h}"`)
                        .join(', ');
                    // const updates = headers.filter(h => !primary_keys.includes(h)).
                    

                    // You need a unique constraint (or primary key) on primary_keys
                    // for ON CONFLICT (primary_keys...) to work.
                    // e.g., ON CONFLICT ("id") or ON CONFLICT ("colA","colB")
                    const conflictClause = primary_keys.length
                        ? '(' + primary_keys.map(pk => `"${pk}"`).join(', ') + ')'
                        : ''; // Handle edge cases where there might be no PK

                    let upsertStmt = '';

                    if (!conflictClause) {
                        console.warn(`Skipping row in ${csvFilePath}, no primary keys found for ${tableName}.`);
                    } else if (config.insert_if_not_exists) {
                        upsertStmt = `
                            INSERT INTO ${tableName} (${insertColumns})
                            VALUES (${insertValues})
                            ON CONFLICT ${conflictClause}
                            DO UPDATE
                               SET ${onConflictUpdates};
                        `;
                        updates.push(upsertStmt);
                    } else {
                        updates.push(`UPDATE ${tableName} SET ${updateValues} WHERE ${primary_keys.map(pk => `"${pk}"`).join(', ')} = ${primary_keys.map(pk => `'${row[pk]}'`).join(', ')};`);
                    }
                });

                resolve(updates);
            })
            .on('error', (err) => {
                console.error(`Error reading CSV file: ${csvFilePath}`, err);
                reject(err);
            });
    });
}

/**
 * Generates the collected UPDATE statements for an array of CSV file paths.
 *
 * @param {string[]} files - Array of CSV file paths.
 * @returns {Promise<string[]>} - Promise resolving to an array of SQL statements.
 */
async function generate(files) {
    let statements = [];

    // Optionally, sort by table order if desired (similar to inserts.js)
    files = files.sort((a, b) => {
        const baseA = path.basename(a).replace('.csv', '');
        const baseB = path.basename(b).replace('.csv', '');
        const tableA = MAIN.tables.findItem('name', baseA);
        const tableB = MAIN.tables.findItem('name', baseB);

        // If either table doesn't exist in MAIN, sort them last
        const orderA = tableA?.order ?? 9999;
        const orderB = tableB?.order ?? 9999;

        return orderA - orderB;
    });

    // For each CSV file, generate the update statements
    for (const filePath of files) {
        const baseName = path.basename(filePath).replace('.csv', '');
        const tableName = baseName; // Here we assume the CSV base name = table name

        let fileUpdates = [];
        try {
            fileUpdates = await generateUpdateStatementsFromCSV(filePath, tableName);
        } catch (err) {
            console.error(`Failed to generate updates for ${tableName}:`, err);
        }

        // Append the statements to our main collection
        // For consistency with the rest of the pipeline, you can add a "-- step" if you wish
        fileUpdates.forEach(stmt => {
            statements.push(stmt);
        });
    }

    return statements;
}

module.exports = {
    generate,
    generateUpdateStatementsFromCSV
}; 