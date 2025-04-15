const { viewExists, generateAndMigrate, closePool, executeQuery } = require('./test-utils');
const fs = require('fs');
const path = require('path');

describe('View Tests', () => {
  // Run once before all tests - make sure to also apply the test data
  beforeAll(async () => {
    // Generate and apply migrations
    await generateAndMigrate();
    
    // Ensure tables exist that are needed for views
    await setupTables();
  });

  // Close pool after all tests
  afterAll(async () => {
    await closePool();
  });
  
  // Setup tables needed for the views to work
  async function setupTables() {
    // Create needed test data
    console.log('Setting up test data for views...');
    
    try {
      // First create a user
      await executeQuery(`
        INSERT INTO public.tbl_user (username, email) 
        VALUES ('viewtestuser', 'viewtest@example.com')
        ON CONFLICT (email) DO NOTHING
      `);
      
      // Then create a test movie
      await executeQuery(`
        INSERT INTO public.tbl_movie (title, description, rating) 
        VALUES ('View Test Movie', 'Test Description', 7.5)
      `);
    } catch (err) {
      console.error('Error setting up test data:', err);
    }
  }

  // Test view file individually
  test('view_reviews_info should exist in public schema', async () => {
    expect(await viewExists('public', 'view_reviews_info')).toBe(true);
  });

  // Test view structure
  test('view_reviews_info should have the correct columns', async () => {
    const result = await executeQuery(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'view_reviews_info'
    `);
    
    // Getting column names from the view
    const columns = result.rows.map(row => row.column_name);
    
    // Check that expected columns exist based on the actual view definition
    expect(columns).toContain('id');
    expect(columns).toContain('userid');
    expect(columns).toContain('username');
    expect(columns).toContain('movieid');
    expect(columns).toContain('title');
    expect(columns).toContain('reviewtext');
    expect(columns).toContain('rating');
    expect(columns).toContain('dtcreated');
  });

  // Test view query returns expected results after generating data
  test('view_reviews_info should return data when queried', async () => {
    // Generate unique values to avoid conflicts
    const uniqueSuffix = Date.now().toString();
    const uniqueUsername = `testuser_view_${uniqueSuffix}`;
    const uniqueEmail = `testview_${uniqueSuffix}@example.com`;
    
    // First, insert a user
    await executeQuery(`
      INSERT INTO public.tbl_user (username, email) 
      VALUES ($1, $2)
    `, [uniqueUsername, uniqueEmail]);
    
    const userResult = await executeQuery(`
      SELECT id FROM public.tbl_user WHERE username = $1 LIMIT 1
    `, [uniqueUsername]);
    
    const userId = userResult.rows[0].id;
    
    // Insert a movie
    const movieTitle = `Test Movie View ${uniqueSuffix}`;
    await executeQuery(`
      INSERT INTO public.tbl_movie (title, description, rating) 
      VALUES ($1, 'Test Description', 7.5)
    `, [movieTitle]);
    
    const movieResult = await executeQuery(`
      SELECT id FROM public.tbl_movie WHERE title = $1 LIMIT 1
    `, [movieTitle]);
    
    const movieId = movieResult.rows[0].id;
    
    // Insert a review with correct column names
    await executeQuery(`
      INSERT INTO public.tbl_review (userid, movieid, rating, reviewtext) 
      VALUES ($1, $2, 8, 'Good movie')
    `, [userId, movieId]);
    
    // Now query the view
    const viewResult = await executeQuery(`
      SELECT * FROM public.view_reviews_info WHERE movieid = $1
    `, [movieId]);
    
    // Verify the view returns expected data with correct column names
    expect(viewResult.rows.length).toBeGreaterThan(0);
    expect(viewResult.rows[0].movieid).toBe(movieId);
    expect(viewResult.rows[0].userid).toBe(userId);
    expect(viewResult.rows[0].rating).toBe(8);
    expect(viewResult.rows[0].reviewtext).toBe('Good movie');
  });

  // Dynamic test generation for all view files
  const viewDir = path.join(__dirname, '..', 'sql', '03_views');
  const viewFiles = fs.readdirSync(viewDir);
  
  viewFiles.forEach(file => {
    if (file.endsWith('.sql')) {
      const parts = file.replace('.sql', '').split('.');
      const schema = parts[0];
      const viewName = parts[1];
      
      test(`View ${viewName} from file ${file} should exist`, async () => {
        expect(await viewExists(schema, viewName)).toBe(true);
      });
    }
  });
}); 