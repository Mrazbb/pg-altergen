/**
 * extensions.js
 *
 * Processes SQL files for PostgreSQL extensions and generates CREATE EXTENSION statements.
 */

const fs = require('fs');
const path = require('path');


/**
 * Processes extension SQL files and stores their information in MAIN.extensions.
 * Extension names are derived from filenames (e.g., "01_uuid-ossp.sql" -> "uuid-ossp").
 *
 * @param {string[]} files - Array of paths to extension SQL files.
 * @returns {Array} The MAIN.extensions array.
 */
function process(files) {
    if (!MAIN.extensions) {
        MAIN.extensions = [];
    }

    for (const file_path of files) {
        try {
            const extension_name = path.basename(file_path, path.extname(file_path)).replace(/^\d+_/, '');

            // Add if not already processed (e.g., if process is called multiple times)
            if (!MAIN.extensions.find(ext => ext.name === extension_name)) {
                MAIN.extensions.push({
                    name: extension_name,
                    file_path: file_path
                });
            }
        } catch (err) {
            console.error(`Error processing extension file ${file_path}:`, err);
        }
    }
    return MAIN.extensions;
}

/**
 * Generates SQL statements for creating extensions based on data in MAIN.extensions.
 *
 * @returns {string[]} Array of SQL CREATE EXTENSION statements.
 */
function generate() {
    const statements = [];
    const extensions = MAIN.extensions || [];
    const stepComment = (typeof STEP_COMMENT !== 'undefined' ? STEP_COMMENT : '\n-- step\n');

    for (const extension of extensions) {
        try {
            // It's generally expected that extension files contain the full CREATE EXTENSION command.
            const file_content = fs.readFileSync(extension.file_path, 'utf8');
            statements.push(file_content.trim() + stepComment);
        } catch (err) {
            console.error(`Error reading extension file ${extension.file_path} for generation:`, err);
            // Optionally, add a commented-out error statement to the SQL output
            // statements.push(`-- ERROR: Could not generate extension ${extension.name} from ${extension.file_path}: ${err.message}${stepComment}`);
        }
    }
    return statements;
}

module.exports = {
    process,
    generate
};