/**
 * types.js
 *
 * Processes SQL files for custom PostgreSQL ENUM types and generates
 * SQL to create or update them idempotently (adds new values, does not remove/reorder).
 */

const fs = require('fs');
const path = require('path');
// Assuming regpatterns.js is in a relative path like '../parsers/regpatterns'
// Adjust if your structure is different.
const REG = require('../parsers/regpatterns'); // Or your actual path to regpatterns

// Assume MAIN is a global object for storing processed data.
// Assume STEP_COMMENT is a global string for SQL statement separation.

const STEP_COMMENT_FALLBACK = '\n-- step\n';

/**
 * Parses a string of enum labels (e.g., "'val1', 'val2', 'another ''value'''")
 * into an array of strings (e.g., ["val1", "val2", "another 'value'"]).
 * @param {string} labelsString - The raw string of labels from the ENUM definition.
 * @returns {string[]} An array of unquoted enum labels.
 */
function parseEnumLabels(labelsString) {
    if (!labelsString) return [];
    const labels = [];
    let currentLabel = '';
    let inQuote = false;
    for (let i = 0; i < labelsString.length; i++) {
        const char = labelsString[i];
        if (char === "'") {
            if (i + 1 < labelsString.length && labelsString[i + 1] === "'") {
                // Escaped single quote
                currentLabel += "'";
                i++; // Skip next quote
            } else {
                inQuote = !inQuote;
                if (!inQuote && currentLabel) { // End of a label
                    // Do not add the surrounding quotes here
                } else if (inQuote && !currentLabel) { // Start of a new label
                    // Reset currentLabel
                }
            }
        } else if (char === ',' && !inQuote) {
            if (currentLabel.trim()) {
                labels.push(currentLabel.trim());
            }
            currentLabel = '';
        } else {
            if (inQuote) { // Only add to currentLabel if inside quotes
               currentLabel += char;
            } else if (char !== ' ' && char !== '\n' && char !== '\r' && char !== '\t') {
                // This case handles unquoted enum values if your style allows,
                // but standard SQL for ENUMs requires single quotes.
                // For safety, we'll assume labels are quoted and this part might be less critical
                // if your SQL files strictly adhere to quoted labels.
                // currentLabel += char; // Potentially problematic if mixed quoted/unquoted
            }
        }
    }
    if (currentLabel.trim()) {
        labels.push(currentLabel.trim());
    }
    // Filter out any empty strings that might have resulted from parsing
    return labels.filter(label => label.length > 0);
}


/**
 * Processes custom type SQL files (specifically ENUMs for now) and stores
 * their parsed information in MAIN.types.
 *
 * @param {string[]} files - Array of paths to custom type SQL files.
 * @returns {Array} The MAIN.types array.
 */
function process(files) {
    if (!MAIN.types) {
        MAIN.types = [];
    }

    for (const file_path of files) {
        try {
            const file_content = fs.readFileSync(file_path, 'utf8');
            REG.TYPE_ENUM_PATTERN.lastIndex = 0; // Reset regex state
            let match;

            while ((match = REG.TYPE_ENUM_PATTERN.exec(file_content)) !== null) {
                const schema = (match.groups.schema || 'public').replace(/"/g, ''); // Default to public if not specified
                const name = match.groups.name.replace(/"/g, '');
                const labelsString = match.groups.labels;
                const labelsArray = parseEnumLabels(labelsString);

                const qualifiedName = `${schema}.${name}`;

                if (!MAIN.types.find(typ => typ.qualifiedName === qualifiedName)) {
                    MAIN.types.push({
                        qualifiedName: qualifiedName,
                        schema: schema,
                        name: name,
                        labels: labelsArray,
                        file_path: file_path
                    });
                } else {
                    // Optionally update if found, e.g., if labels changed in the file
                    const existingType = MAIN.types.find(typ => typ.qualifiedName === qualifiedName);
                    if (existingType) {
                        existingType.labels = labelsArray;
                        existingType.file_path = file_path; // Update path if it changed
                    }
                }
            }
        } catch (err) {
            console.error(`Error processing type file ${file_path}:`, err);
        }
    }
    return MAIN.types;
}

/**
 * Generates SQL for a helper function to manage ENUM types idempotently.
 * This function should be included once in the final SQL script.
 * @returns {string} The SQL definition for the helper function.
 */
function getEnumTypeHelperFunctionSql() {
    return `
-- Helper function to create/update an ENUM type idempotently.
-- Adds new labels, does NOT remove or reorder existing labels.
CREATE OR REPLACE FUNCTION manage_enum_type(
    p_schema_name TEXT,
    p_type_name TEXT,
    p_desired_labels TEXT[]
)
RETURNS VOID AS $$
DECLARE
    v_qualified_name TEXT := quote_ident(p_schema_name) || '.' || quote_ident(p_type_name);
    v_type_exists BOOLEAN;
    v_current_labels TEXT[];
    v_label_to_add TEXT;
    v_sql TEXT;
    v_existing_label_to_check TEXT;
    v_last_existing_label TEXT;
BEGIN
    -- Check if the type exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = p_schema_name AND t.typname = p_type_name AND t.typtype = 'e' -- 'e' for enum
    ) INTO v_type_exists;

    IF NOT v_type_exists THEN
        -- Type does not exist, create it
        IF array_length(p_desired_labels, 1) > 0 THEN
            v_sql := 'CREATE TYPE ' || v_qualified_name || ' AS ENUM (';
            FOR i IN 1..array_length(p_desired_labels, 1) LOOP
                v_sql := v_sql || quote_literal(p_desired_labels[i]);
                IF i < array_length(p_desired_labels, 1) THEN
                    v_sql := v_sql || ', ';
                END IF;
            END LOOP;
            v_sql := v_sql || ');';
            EXECUTE v_sql;
            RAISE NOTICE 'Enum type %.% created with labels: %', p_schema_name, p_type_name, p_desired_labels;
        ELSE
            RAISE WARNING 'Enum type %.% cannot be created with no labels.', p_schema_name, p_type_name;
        END IF;
    ELSE
        -- Type exists, check for new labels to add
        SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
        INTO v_current_labels
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = p_schema_name AND t.typname = p_type_name;

        -- Find the last existing label to add new labels after it
        IF array_length(v_current_labels, 1) > 0 THEN
            v_last_existing_label := v_current_labels[array_length(v_current_labels, 1)];
        ELSE
            v_last_existing_label := NULL; -- Should not happen if type exists with values
        END IF;

        FOREACH v_label_to_add IN ARRAY p_desired_labels
        LOOP
            -- Check if this desired label already exists in current labels
            SELECT e.enumlabel INTO v_existing_label_to_check
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = p_schema_name AND t.typname = p_type_name AND e.enumlabel = v_label_to_add;

            IF v_existing_label_to_check IS NULL THEN
                -- Label does not exist, add it
                -- Try to add AFTER the last known existing label, if any.
                -- If no existing labels (empty enum, though rare), just add.
                IF v_last_existing_label IS NOT NULL THEN
                    v_sql := 'ALTER TYPE ' || v_qualified_name || ' ADD VALUE ' || quote_literal(v_label_to_add) || ' AFTER ' || quote_literal(v_last_existing_label) || ';';
                ELSE
                     v_sql := 'ALTER TYPE ' || v_qualified_name || ' ADD VALUE ' || quote_literal(v_label_to_add) || ';';
                END IF;
                EXECUTE v_sql;
                RAISE NOTICE 'Added label ''%'' to enum type %.%', v_label_to_add, p_schema_name, p_type_name;
                -- Update the last known label for subsequent additions in this run
                v_last_existing_label := v_label_to_add;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
`;
}

/**
 * Generates SQL statements for creating/updating ENUM types.
 *
 * @returns {string[]} Array of SQL statements. The first statement will be the
 *                     helper function definition, followed by calls to it.
 */
function generate() {
    const statements = [];
    const types = MAIN.types || [];
    const stepComment = (typeof STEP_COMMENT !== 'undefined' ? STEP_COMMENT : STEP_COMMENT_FALLBACK);

    if (types.length === 0) {
        return [];
    }

    // 1. Add the helper function definition (only once)
    statements.push(getEnumTypeHelperFunctionSql().trim());

    // 2. For each processed type, generate a call to the helper function
    for (const type_item of types) {
        if (type_item.labels && type_item.labels.length > 0) {
            // Format labels array for SQL: ARRAY['val1', 'val2']
            const sqlLabelsArray = `ARRAY[${type_item.labels.map(l => `'${l.replace(/'/g, "''")}'`).join(', ')}]`;
            const callStmt = `SELECT manage_enum_type('${type_item.schema.replace(/'/g, "''")}', '${type_item.name.replace(/'/g, "''")}', ${sqlLabelsArray});`;
            statements.push(callStmt);
        } else {
            // Handle types with no labels if necessary (e.g., log a warning)
            console.warn(`Type ${type_item.qualifiedName} from ${type_item.file_path} has no labels defined or parsed. Skipping generation for it.`);
        }
    }

    // Add step comments between statements if desired by the main script
    return statements.map((stmt, index) => index > 0 ? stepComment + stmt : stmt);
}

module.exports = {
    process,
    generate,
    getEnumTypeHelperFunctionSql // Exporting for potential direct use or testing
};