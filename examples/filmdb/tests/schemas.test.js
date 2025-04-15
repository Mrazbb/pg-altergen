const { schemaExists, generateAndMigrate, closePool } = require('./test-utils');
const fs = require('fs');
const path = require('path');

describe('Schema Tests', () => {
  // Run once before all tests
  beforeAll(async () => {
    // Generate and apply migrations
    await generateAndMigrate();
  });

  // Close pool after all tests
  afterAll(async () => {
    await closePool();
  });

  // Test each schema file
  test('public schema should exist', async () => {
    expect(await schemaExists('public')).toBe(true);
  });

  test('sample schema should exist', async () => {
    expect(await schemaExists('sample')).toBe(true);
  });

  // Dynamic test generation for all schema files
  const schemaDir = path.join(__dirname, '..', 'sql', '01_schemas');
  const schemaFiles = fs.readdirSync(schemaDir);
  
  schemaFiles.forEach(file => {
    if (file.endsWith('.sql')) {
      const schemaName = file.replace('.sql', '');
      
      test(`Schema from file ${file} should exist`, async () => {
        expect(await schemaExists(schemaName)).toBe(true);
      });
    }
  });
}); 