const { tableExists, generateAndMigrate, closePool, executeQuery } = require('./test-utils');
const fs = require('fs');
const path = require('path');

// Define a function to extract table name from SQL file
function extractTableNameFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Extract table name from CREATE TABLE statement
    const match = content.match(/CREATE\s+TABLE\s+(?:"|')?(\w+)(?:"|')?\.(?:"|')?(\w+)(?:"|')?/i);
    if (match && match.length >= 3) {
      return {
        schema: match[1],
        tableName: match[2]
      };
    }
    return null;
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return null;
  }
}

describe('Table Tests', () => {
  // Run once before all tests
  beforeAll(async () => {
    // Generate and apply migrations
    await generateAndMigrate();
  });

  // Close pool after all tests
  afterAll(async () => {
    await closePool();
  });

  // Test each table file individually
  test('tbl_movie should exist in public schema', async () => {
    expect(await tableExists('public', 'tbl_movie')).toBe(true);
  });

  test('tbl_review should exist in public schema', async () => {
    expect(await tableExists('public', 'tbl_review')).toBe(true);
  });

  test('tbl_config should exist in public schema', async () => {
    expect(await tableExists('public', 'tbl_config')).toBe(true);
  });

  test('tbl_user should exist in public schema', async () => {
    expect(await tableExists('public', 'tbl_user')).toBe(true);
  });

  // Test table structure for tbl_movie
  test('tbl_movie should have the correct columns', async () => {
    const result = await executeQuery(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tbl_movie'
    `);
    
    const columns = result.rows.map(row => row.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('title');
    expect(columns).toContain('description');
    expect(columns).toContain('rating');
    expect(columns).toContain('images');
    expect(columns).toContain('dtreleased');
    expect(columns).toContain('dtcreated');
    expect(columns).toContain('dtupdated');
    expect(columns).toContain('dtremoved');
  });

  // Test each SQL file to ensure it corresponds to an existing table
  const tableDir = path.join(__dirname, '..', 'sql', '02_tables');
  const tableFiles = fs.readdirSync(tableDir);
  
  // Create a mapping of file name to actual table name
  const tableMapping = {
    'public.tbl_config.sql': { schema: 'public', tableName: 'tbl_config' },
    'public.tbl_movie.sql': { schema: 'public', tableName: 'tbl_movie' },
    'public.tbl_review.sql': { schema: 'public', tableName: 'tbl_review' },
    'public.tbl_user.sql': { schema: 'public', tableName: 'tbl_user' }
  };
  
  tableFiles.forEach(file => {
    if (file.endsWith('.sql')) {
      // Use the mapping if available, otherwise extract from file name
      const tableInfo = tableMapping[file] || (() => {
        const parts = file.replace('.sql', '').split('.');
        return { schema: parts[0], tableName: parts[1] };
      })();
      
      test(`Table defined in ${file} should exist`, async () => {
        console.log(`Testing if table ${tableInfo.schema}.${tableInfo.tableName} exists`);
        expect(await tableExists(tableInfo.schema, tableInfo.tableName)).toBe(true);
      });
    }
  });
}); 