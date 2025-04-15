#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { cleanDatabase } = require('./test-utils');

async function main() {
  try {
    // Ensure we have needed dependencies
    try {
      require('pg');
      require('jest');
    } catch (error) {
      console.error('Missing dependencies. Please run: npm install --save-dev jest pg');
      process.exit(1);
    }

    // Check if Docker is running
    try {
      console.log('Checking Docker status...');
      execSync('docker ps', { stdio: 'ignore' });
    } catch (error) {
      console.error('Docker does not appear to be running. Please start Docker first.');
      process.exit(1);
    }

    // Check if postgres container is running
    let postgresRunning = false;
    try {
      const dockerPs = execSync('docker ps').toString();
      postgresRunning = dockerPs.includes('postgres');
    } catch (error) {
      // Docker isn't running or some other error
    }

    // Start the Postgres container if not already running
    if (!postgresRunning) {
      console.log('Starting Postgres container...');
      try {
        execSync('docker-compose up -d', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log('Postgres container started.');
        
        // Wait for PostgreSQL to be ready
        console.log('Waiting for PostgreSQL to be ready...');
        let ready = false;
        let attempts = 0;
        
        while (!ready && attempts < 10) {
          try {
            execSync('docker exec $(docker ps -q --filter name=postgres) pg_isready -U postgres', { stdio: 'ignore' });
            ready = true;
          } catch (error) {
            attempts++;
            console.log(`Waiting for PostgreSQL to start... (${attempts}/10)`);
            execSync('sleep 1');
          }
        }
        
        if (!ready) {
          console.error('PostgreSQL did not start in time. Please check your docker-compose configuration.');
          process.exit(1);
        }
        
        console.log('PostgreSQL is ready!');
      } catch (error) {
        console.error('Failed to start Postgres container:', error.message);
        process.exit(1);
      }
    }
    
    // Clean database before tests - only schemas defined in 01_schemas
    console.log('Cleaning the database before tests (only schemas defined in sql/01_schemas)...');
    await cleanDatabase();
    
    // Run tests sequentially using a single Jest process
    await runTestsSequentially();
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

// Run tests one at a time to avoid connection pool issues
async function runTestsSequentially() {
  console.log('Running tests sequentially...');
  const rootDir = path.join(__dirname, '..');
  
  try {
    // Run tests in a specific order to ensure dependencies
    const testFiles = [
      'tests/schemas.test.js',
      'tests/tables.test.js',
      'tests/views.test.js',
      'tests/functions.test.js',
      'tests/integration.test.js'
    ];
    
    // Use a single Jest process with --runInBand to ensure sequential execution
    execSync(`npx jest ${testFiles.join(' ')} --runInBand`, { 
      stdio: 'inherit', 
      cwd: rootDir 
    });
    
    console.log('\nAll tests completed successfully!');
    return true;
  } catch (error) {
    console.error('\nSome tests failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
}); 