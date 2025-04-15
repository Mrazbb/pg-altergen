const { executeQuery, closePool } = require('./test-utils');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('pg-altergen Integration Tests', () => {
  // Close connections after all tests
  afterAll(async () => {
    await closePool();
  });

   // Test the migrate process
  test('pg-altergen migrate should apply changes to database', async () => {
    // Run the migrate command
    execSync('npx pg-altergen migrate', { stdio: 'inherit' });
    
    // Verify database has the expected objects
    const tables = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'tbl_%'
    `);
    
    const views = await executeQuery(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    
    const functions = await executeQuery(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    `);
    
    // Convert results to arrays of names
    const tableNames = tables.rows.map(row => row.table_name);
    const viewNames = views.rows.map(row => row.table_name);
    const functionNames = functions.rows.map(row => row.routine_name);
    
    // Check for specific objects
    expect(tableNames).toContain('tbl_movie');
    expect(tableNames).toContain('tbl_review');
    expect(viewNames).toContain('view_reviews_info');
    expect(functionNames).toContain('fn_insert_movie');
    expect(functionNames).toContain('fn_insert_review');
  });

  // Test full data flow through the system 
  test('should allow complete data flow through tables, functions and views', async () => {
    // Generate unique values to avoid conflicts
    const uniqueSuffix = Date.now().toString();
    const uniqueUsername = `integrationuser_${uniqueSuffix}`;
    const uniqueEmail = `integration_${uniqueSuffix}@example.com`;
    const movieTitle = `Integration Test Movie ${uniqueSuffix}`;
    
    // Step 1: Insert a user
    await executeQuery(`
      INSERT INTO public.tbl_user (username, email) 
      VALUES ($1, $2)
    `, [uniqueUsername, uniqueEmail]);
    
    const userResult = await executeQuery(`
      SELECT id FROM public.tbl_user WHERE username = $1 LIMIT 1
    `, [uniqueUsername]);
    
    const userId = userResult.rows[0].id;
    
    // Step 2: Insert movie using function
    const movieResult = await executeQuery(`
      SELECT * FROM public.fn_insert_movie($1, $2, $3)
    `, [movieTitle, 'Integration Test Description', '2023-01-01']);
    
    const movieId = movieResult.rows[0].fn_insert_movie;
    expect(movieId).toBeTruthy();
    
    // Step 3: Insert review using function with correct parameter order
    const reviewResult = await executeQuery(`
      SELECT * FROM public.fn_insert_review($1, $2, $3, $4)
    `, [userId, movieId, 'Integration test review', 9]);
    
    const reviewId = reviewResult.rows[0].fn_insert_review;
    expect(reviewId).toBeTruthy();
    
    // Step 4: Check view for data
    const viewResult = await executeQuery(`
      SELECT * FROM public.view_reviews_info WHERE movieid = $1
    `, [movieId]);
    
    expect(viewResult.rows.length).toBe(1);
    expect(viewResult.rows[0].movieid).toBe(Number(movieId));
    expect(viewResult.rows[0].userid).toBe(Number(userId));
    expect(viewResult.rows[0].rating).toBe(9);
    expect(viewResult.rows[0].reviewtext).toBe('Integration test review');
  });
}); 