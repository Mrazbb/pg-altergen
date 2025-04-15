const { functionExists, generateAndMigrate, closePool, executeQuery } = require('./test-utils');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

describe('Function Tests', () => {
  let pool;
  let createdMovieId;
  let createdUserId;
  
  // First beforeAll - run migrations
  beforeAll(async () => {
    // Generate and apply migrations
    await generateAndMigrate();
    
    // Create the pool after migrations are applied
    pool = new Pool();
  });
  
  // Second beforeAll - set up test data after migrations
  beforeAll(async () => {
    try {
      // Set up test data
      // First create a user
      const userResult = await executeQuery(`
        INSERT INTO public.tbl_user (username, email) 
        VALUES ('functiontestuser', 'functiontest@example.com')
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `);
      createdUserId = userResult.rows[0]?.id;
      
      // Then create a test movie
      const movieResult = await executeQuery(`
        INSERT INTO public.tbl_movie (title, description, rating) 
        VALUES ('Function Test Movie', 'Test Description', 7.5)
        RETURNING id
      `);
      createdMovieId = movieResult.rows[0]?.id;
      console.log('Created movie ID for functions test:', createdMovieId);
      
    } catch (err) {
      console.error('Error in beforeAll:', err);
    }
  });
  
  // Close pool after all tests
  afterAll(async () => {
    await closePool();
  });

  // Test each function file individually
  test('fn_insert_review should exist in public schema', async () => {
    expect(await functionExists('public', 'fn_insert_review')).toBe(true);
  });

  test('fn_user_status should exist in public schema', async () => {
    expect(await functionExists('public', 'fn_user_status')).toBe(true);
  });

  test('fn_insert_movie should exist in public schema', async () => {
    expect(await functionExists('public', 'fn_insert_movie')).toBe(true);
  });

  // Test function behavior - fn_insert_movie
  test('fn_insert_movie should insert a movie and return ID', async () => {
    const uniqueSuffix = Date.now().toString();
    const title = `Function Test Movie ${uniqueSuffix}`;
    const description = 'Test Description';
    const releaseDate = '2023-01-01';
    
    const result = await executeQuery(`
      SELECT * FROM public.fn_insert_movie($1, $2, $3)
    `, [title, description, releaseDate]);
    
    // Function should return an ID
    expect(result.rows[0].fn_insert_movie).toBeTruthy();
    
    // Verify the movie was actually inserted
    const movieResult = await executeQuery(`
      SELECT * FROM public.tbl_movie WHERE id = $1
    `, [result.rows[0].fn_insert_movie]);
    
    expect(movieResult.rows.length).toBe(1);
    expect(movieResult.rows[0].title).toBe(title);
    expect(movieResult.rows[0].description).toBe(description);
  });

  // Test function behavior - fn_insert_review
  test('fn_insert_review should insert a review and return ID', async () => {
    // Generate unique values to avoid conflicts
    const uniqueSuffix = Date.now().toString();
    const uniqueUsername = `functiontestuser_${uniqueSuffix}`;
    const uniqueEmail = `functiontest_${uniqueSuffix}@example.com`;
    const movieTitle = `Review Test Movie ${uniqueSuffix}`;
    
    // First, create a user
    await executeQuery(`
      INSERT INTO public.tbl_user (username, email) 
      VALUES ($1, $2)
    `, [uniqueUsername, uniqueEmail]);
    
    const userResult = await executeQuery(`
      SELECT id FROM public.tbl_user WHERE username = $1 LIMIT 1
    `, [uniqueUsername]);
    
    const userId = userResult.rows[0].id;
    
    // Create a movie to reference
    const movieResult = await executeQuery(`
      SELECT * FROM public.fn_insert_movie($1, $2, $3)
    `, [movieTitle, 'Test Description', '2023-01-01']);
    
    const movieId = movieResult.rows[0].fn_insert_movie;
    
    // Now test the review insertion function with correct parameter order
    const rating = 9;
    const reviewText = 'Excellent movie!';
    
    const result = await executeQuery(`
      SELECT * FROM public.fn_insert_review($1, $2, $3, $4)
    `, [userId, movieId, reviewText, rating]);
    
    // Function should return an ID
    expect(result.rows[0].fn_insert_review).toBeTruthy();
    
    // Verify the review was actually inserted with correct column names
    const reviewResult = await executeQuery(`
      SELECT * FROM public.tbl_review WHERE id = $1
    `, [result.rows[0].fn_insert_review]);
    
    expect(reviewResult.rows.length).toBe(1);
    expect(reviewResult.rows[0].userid).toBe(userId);
    expect(reviewResult.rows[0].movieid).toBe(Number(movieId));
    expect(reviewResult.rows[0].rating).toBe(rating);
    expect(reviewResult.rows[0].reviewtext).toBe(reviewText);
  });

  // Dynamic test generation for all function files
  const functionDir = path.join(__dirname, '..', 'sql', '04_functions');
  const functionFiles = fs.readdirSync(functionDir);
  
  functionFiles.forEach(file => {
    if (file.endsWith('.sql')) {
      const parts = file.replace('.sql', '').split('.');
      const schema = parts[0];
      const functionName = parts[1];
      
      test(`Function ${functionName} from file ${file} should exist`, async () => {
        expect(await functionExists(schema, functionName)).toBe(true);
      });
    }
  });
  
}); 