
require('total5');
const dotenv = require('dotenv');

const { generateCommand } = require('./commands/generate');
const { migrateCommand } = require('./commands/migrate');
const fs = require('fs');

const SQL_OBJECT_TYPES = {
    schemas: '01_schemas',
    tables: '02_tables',
    views: '03_views',
    functions: '04_functions',
    procedures: '05_procedures',
    triggers: '06_triggers',
    sequences: '07_sequences',
    types: '08_types',
    extensions: '09_extensions',
    inserts: '10_inserts',
    updates: '11_updates',
    migrations: '12_migrations'
};


global.SQL_OBJECT_TYPES = SQL_OBJECT_TYPES;

const STEP_COMMENT = '\n-- step\n';
 
global.STEP_COMMENT = STEP_COMMENT;

/**
 * The main CLI dispatcher:
 *  1) Extract the command ("generate", "migrate", etc.)
 *  2) Load config from args
 *  3) Execute the corresponding command file
 */
async function runCLI(argv) {
    // Extract the main command and any extra CLI args
    const [command, ...rest] = argv;
    const config = loadConfig(rest);

    // Example of storing config globally if you rely on that pattern
    // But ideally pass "config" down to modules that need it
    global.config = config;

    // Initialize global MAIN arrays if still needed
    global.MAIN = {
        schemas: [],    // {name: 'schema_name', file_path: 'path/to/file.sql'}
        tables: [],     // {name: 'table_name', file_path: 'path/to/file.sql'}
        views: [],      // {name: 'view_name', file_path: 'path/to/file.sql'}
        functions: [],  // {name: 'function_name', file_path: 'path/to/file.sql'}
        procedures: [], // {name: 'procedure_name', file_path: 'path/to/file.sql'}
        triggers: [],   // {name: 'trigger_name', file_path: 'path/to/file.sql'}
        sequences: [],  // {name: 'sequence_name', file_path: 'path/to/file.sql'}
        types: [],      // {name: 'type_name', file_path: 'path/to/file.sql'}
        extensions: [], // {name: 'extension_name', file_path: 'path/to/file.sql'}
        inserts: [],    // {name: 'insert_name', file_path: 'path/to/file.sql'}
        updates: [],    // {name: 'update_name', file_path: 'path/to/file.sql'}
    };

    if (!command) {
        console.log('No command specified. Try "generate" or "migrate".');
        process.exit(1);
    }

    switch (command) {
        case 'generate':
            await generateCommand(config);
            break;
        case 'migrate':
            await migrateCommand(config);
            break;
        default:
            console.log(`Unknown command: ${command}`);
            console.log('Available commands: generate, migrate');
            process.exit(1);
    }
}

/**
 * Minimal config loading from CLI args, .env file, and altergen.json
 * Priority: CLI args > altergen.json > .env
 */
function loadConfig(args) {
    let config = {};
    
    // First, load from CLI args
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--') && args.length > i + 1) {
            config[args[i].replace(/^--/, '')] = args[i + 1];
            i++;
        }
    }

    // try to load from .env file
    const env = dotenv.config();

    if (env?.parsed) {
        for (let key in env.parsed) {
            if (key.startsWith('altergen_')) {
                config[key.replace('altergen_', '')] = env.parsed[key];
            }
        }
    }

    // Default config file if none provided
    if (!config.config) {
        config.config = 'altergen.json';
    }

    // Try to load from config file (altergen.json)
    let fileJsonLoaded = false;
    let data;
    try {
        data = fs.readFileSync(config.config, 'utf8');
        const fileJson = JSON.parse(data);
        for (let key in fileJson) {
            // Only set if not already set by CLI args
            if (!config[key]) {
                config[key] = fileJson[key];
            }
        }
        fileJsonLoaded = true;
    } catch (e) {
        console.log(`Config file not found: ${config.config}`);
    }
    config.additional_source_dirs = config.additional_source_dirs?.split(/[\s,]+/)
        ?.map(dir => dir.trim())
        ?.filter(dir => dir !== '') || [];

    // Provide a fallback for the final output file
    if (!config.output_file) {
        config.output_file = 'alter.sql';
    }

    return config;
}

module.exports = { runCLI }; 