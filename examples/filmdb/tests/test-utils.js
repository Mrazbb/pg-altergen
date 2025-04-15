const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the altergen config to get connection string
const altergenConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'altergen.json'), 'utf8'));
const connectionString = `postgres://${altergenConfig.postgres}`;

// Extract database name and connection details from connection string
const dbName = connectionString.split('/').pop();

// Create a connection pool for tests - initialize later
let pool = null;

// Get list of schemas from 01_schemas folder
function getDefinedSchemas() {
  const schemaDir = path.join(__dirname, '..', 'sql', '01_schemas');
  try {
    const files = fs.readdirSync(schemaDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .map(file => file.replace('.sql', ''));
  } catch (err) {
    console.error('Error reading schemas directory:', err);
    return ['public']; // default to public if error
  }
}

// Helper function to verify database connection
async function testConnection() {
  console.log('Testing database connection...');
  
  // Create a new pool for this test
  const testPool = new Pool({
    connectionString
  });
  
  try {
    // Try to connect and query information_schema
    const result = await testPool.query(`
      SELECT current_database() as db, current_user as user
    `);
    
    console.log(`Connected to database ${result.rows[0].db} as user ${result.rows[0].user}`);
    
    // Test that we can access information_schema
    const infoSchemaTest = await testPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tables'
      )
    `);
    
    if (infoSchemaTest.rows[0].exists) {
      console.log('Successfully connected to information_schema');
      return true;
    } else {
      console.error('Could not access information_schema tables');
      return false;
    }
  } catch (error) {
    console.error('Error testing database connection:', error);
    return false;
  } finally {
    await testPool.end();
  }
}

// Helper function to clean the database and drop all objects in defined schemas
async function cleanDatabase() {
  console.log(`Cleaning database: ${dbName}`);
  
  // First test the connection to make sure we can access information_schema
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('Database connection test failed, aborting cleanup');
    return false;
  }
  
  // Get schemas defined in the 01_schemas folder
  const definedSchemas = getDefinedSchemas();
  console.log(`Will only clean objects in schemas: ${definedSchemas.join(', ')}`);
  
  // Initialize pool if needed
  if (!pool) {
    pool = new Pool({
      connectionString
    });
  }
  
  const client = await pool.connect();
  try {
    // First disable triggers temporarily
    await client.query('SET session_replication_role = replica;');
    
    // Construct schema filter for SQL queries
    const schemaFilter = definedSchemas.map(s => `'${s}'`).join(',');
    
    // Drop all views
    console.log('Dropping views...');
    const viewsResult = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.views 
      WHERE table_schema IN (${schemaFilter})
    `);
    
    for (const view of viewsResult.rows) {
      console.log(`Dropping view: ${view.table_schema}.${view.table_name}`);
      await client.query(`DROP VIEW IF EXISTS "${view.table_schema}"."${view.table_name}" CASCADE`);
    }
    
    // Drop all procedures
    console.log('Dropping procedures...');
    const proceduresResult = await client.query(`
      SELECT routine_schema, routine_name
      FROM information_schema.routines
      WHERE routine_type = 'PROCEDURE'
      AND routine_schema IN (${schemaFilter})
    `);
    
    for (const proc of proceduresResult.rows) {
      console.log(`Dropping procedure: ${proc.routine_schema}.${proc.routine_name}`);
      await client.query(`DROP PROCEDURE IF EXISTS "${proc.routine_schema}"."${proc.routine_name}" CASCADE`);
    }
    
    // Drop all functions
    console.log('Dropping functions...');
    const functionsResult = await client.query(`
      SELECT routine_schema, routine_name
      FROM information_schema.routines
      WHERE routine_type = 'FUNCTION'
      AND routine_schema IN (${schemaFilter})
    `);
    
    for (const func of functionsResult.rows) {
      console.log(`Dropping function: ${func.routine_schema}.${func.routine_name}`);
      await client.query(`DROP FUNCTION IF EXISTS "${func.routine_schema}"."${func.routine_name}" CASCADE`);
    }
    
    // Drop all triggers
    console.log('Dropping triggers...');
    const triggersResult = await client.query(`
      SELECT trigger_schema, trigger_name, event_object_table, event_object_schema
      FROM information_schema.triggers
      WHERE trigger_schema IN (${schemaFilter})
    `);
    
    for (const trigger of triggersResult.rows) {
      console.log(`Dropping trigger: ${trigger.trigger_schema}.${trigger.trigger_name}`);
      await client.query(`DROP TRIGGER IF EXISTS "${trigger.trigger_name}" ON "${trigger.event_object_schema}"."${trigger.event_object_table}" CASCADE`);
    }
    
    // Drop all sequences (that aren't owned by tables)
    console.log('Dropping sequences...');
    const sequencesResult = await client.query(`
      SELECT sequence_schema, sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema IN (${schemaFilter})
    `);
    
    for (const seq of sequencesResult.rows) {
      console.log(`Dropping sequence: ${seq.sequence_schema}.${seq.sequence_name}`);
      try {
        await client.query(`DROP SEQUENCE IF EXISTS "${seq.sequence_schema}"."${seq.sequence_name}" CASCADE`);
      } catch (err) {
        // Ignore errors from sequences owned by tables
        console.log(`Info: Could not drop sequence ${seq.sequence_schema}.${seq.sequence_name}, it might be owned by a table`);
      }
    }
    
    // Drop all domain types
    console.log('Dropping domain types...');
    const domainTypesResult = await client.query(`
      SELECT domain_schema, domain_name
      FROM information_schema.domains
      WHERE domain_schema IN (${schemaFilter})
    `);
    
    for (const domain of domainTypesResult.rows) {
      console.log(`Dropping domain: ${domain.domain_schema}.${domain.domain_name}`);
      try {
        await client.query(`DROP DOMAIN IF EXISTS "${domain.domain_schema}"."${domain.domain_name}" CASCADE`);
      } catch (err) {
        console.log(`Warning: Could not drop domain ${domain.domain_schema}.${domain.domain_name}: ${err.message}`);
      }
    }

    // Drop all custom types - EXCLUDE sequence types 
    console.log('Dropping custom types...');
    // This query specifically excludes types that are related to sequences
    const typesResult = await client.query(`
      SELECT typname, nspname 
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname IN (${schemaFilter})
      AND typtype = 'c'  -- Composite types only
      AND typname NOT LIKE 'pg_%'  -- Skip system types
      AND NOT EXISTS ( -- Skip types associated with sequences
        SELECT 1 FROM pg_class c 
        WHERE c.relkind = 'S' 
        AND c.relname = typname
      )
    `);
    
    for (const type of typesResult.rows) {
      console.log(`Dropping type: ${type.nspname}.${type.typname}`);
      try {
        await client.query(`DROP TYPE IF EXISTS "${type.nspname}"."${type.typname}" CASCADE`);
      } catch (err) {
        console.log(`Warning: Could not drop type ${type.nspname}.${type.typname}: ${err.message}`);
      }
    }
    
    // Truncate all tables
    console.log('Truncating tables...');
    const tablesResult = await client.query(`
      SELECT tablename, schemaname
      FROM pg_tables
      WHERE schemaname IN (${schemaFilter})
    `);
    
    if (tablesResult.rows.length > 0) {
      // Build a list of tables for truncate statement
      const tableList = tablesResult.rows
        .map(t => `"${t.schemaname}"."${t.tablename}"`)
        .join(', ');
      
      // Truncate all tables in a single command
      if (tableList) {
        console.log(`Truncating tables: ${tableList}`);
        try {
          await client.query(`TRUNCATE TABLE ${tableList} CASCADE`);
        } catch (err) {
          console.log(`Warning: Could not truncate all tables: ${err.message}`);
          console.log('Will try to drop tables directly instead');
        }
      }
    }
    
    // Drop all tables
    console.log('Dropping tables...');
    for (const table of tablesResult.rows) {
      console.log(`Dropping table: ${table.schemaname}.${table.tablename}`);
      try {
        await client.query(`DROP TABLE IF EXISTS "${table.schemaname}"."${table.tablename}" CASCADE`);
      } catch (err) {
        console.log(`Warning: Could not drop table ${table.schemaname}.${table.tablename}: ${err.message}`);
      }
    }
    
    // Re-enable triggers
    await client.query('SET session_replication_role = DEFAULT;');
    
    console.log(`Database ${dbName} has been cleaned for schemas: ${definedSchemas.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Error cleaning database:', error);
    return false;
  } finally {
    client.release();
  }
}

// Helper function to execute SQL query
async function executeQuery(query, params = []) {
  // Initialize pool if needed
  if (!pool) {
    pool = new Pool({
      connectionString
    });
  }
  
  const client = await pool.connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

// Helper function to execute a SQL file
async function executeSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return executeQuery(sql);
}

// Helper function to check if table exists
async function tableExists(schema, tableName) {
  const result = await executeQuery(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables 
       WHERE table_schema = $1 
       AND table_name = $2
     )`,
    [schema, tableName]
  );
  return result.rows[0].exists;
}

// Helper function to check if schema exists
async function schemaExists(schemaName) {
  const result = await executeQuery(
    `SELECT EXISTS (
       SELECT FROM information_schema.schemata 
       WHERE schema_name = $1
     )`,
    [schemaName]
  );
  return result.rows[0].exists;
}

// Helper function to check if view exists
async function viewExists(schema, viewName) {
  const result = await executeQuery(
    `SELECT EXISTS (
       SELECT FROM information_schema.views 
       WHERE table_schema = $1 
       AND table_name = $2
     )`,
    [schema, viewName]
  );
  return result.rows[0].exists;
}

// Helper function to check if function exists
async function functionExists(schema, functionName) {
  const result = await executeQuery(
    `SELECT EXISTS (
       SELECT FROM information_schema.routines 
       WHERE routine_schema = $1 
       AND routine_name = $2
       AND routine_type = 'FUNCTION'
     )`,
    [schema, functionName]
  );
  return result.rows[0].exists;
}

// Generate and migrate SQL files using pg-altergen
async function generateAndMigrate() {
  try {
    // First clean the database to ensure a clean state
    await cleanDatabase();
    
    console.log('Generating migration script...');
    execSync('npx pg-altergen generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    console.log('Applying migrations...');
    execSync('npx pg-altergen migrate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    return true;
  } catch (error) {
    console.error('Error during generate or migrate:', error);
    return false;
  }
}

// Close all connections when done
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  executeQuery,
  executeSqlFile,
  tableExists,
  schemaExists,
  viewExists,
  functionExists,
  generateAndMigrate,
  cleanDatabase,
  testConnection,
  closePool,
  connectionString
}; 