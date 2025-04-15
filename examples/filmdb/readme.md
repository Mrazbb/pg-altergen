# FilmDB Testing Suite

This is a comprehensive testing suite for the FilmDB example project using pg-altergen.

## Prerequisites

- Node.js (v14 or newer)
- Docker and docker-compose
- PostgreSQL container configured in docker-compose.yml

## Installation

1. Install the required dependencies:

```bash
npm install --save-dev jest pg
```

## Test Structure

The test suite is organized into separate files that test specific components of the database:

- `schemas.test.js` - Tests for schema creation
- `tables.test.js` - Tests for table creation and structure
- `views.test.js` - Tests for view creation and functionality
- `functions.test.js` - Tests for function creation and behavior
- `integration.test.js` - End-to-end tests for the entire system

## Running Tests

You can run individual test files or the entire test suite:

### Run all tests

```bash
npm run test:all
```

This will start the PostgreSQL container if needed and run all tests in sequence.

### Run specific test files

```bash
# Test schemas only
npm run test:schemas

# Test tables only
npm run test:tables

# Test views only
npm run test:views

# Test functions only
npm run test:functions
```

### Run a single test

To run a specific test, you can use Jest's filtering capabilities:

```bash
npx jest -t "name of your test"
```

## Understanding the Test Utilities

The `test-utils.js` file provides helper functions to:

- Connect to the database
- Execute SQL queries
- Check if database objects exist
- Run pg-altergen commands

## Test Flow

The tests follow this general workflow:

1. Generate and apply migrations using pg-altergen
2. Verify database objects exist
3. Test functionality of functions and views
4. Insert and retrieve data through the system

## Adding New Tests

To add tests for new database objects:

1. Create a new test file (e.g., `procedures.test.js`)
2. Import the necessary utilities from `test-utils.js`
3. Write tests that verify the existence and functionality of your objects
4. Add a new script in package.json to run your test file