#!/usr/bin/env node

const { cleanDatabase, testConnection } = require('./tests/test-utils');

/**
 * Main function to clean the database
 */
async function main() {
  console.log('Verifying database connection...');
  
  // First verify we can connect to the database and information_schema
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('Database connection failed. Please check your database settings in altergen.json');
    process.exit(1);
  }
  
  console.log('Cleaning database (by dropping and recreating schemas)...');
  
  // Clean the database
  const success = await cleanDatabase();
  
  if (success) {
    console.log('Database cleanup completed successfully.');
  } else {
    console.error('Database cleanup failed. See error messages above for details.');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 