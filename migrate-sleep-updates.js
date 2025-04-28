/**
 * Migration script to update the database schema with new sleep tracking fields
 * 
 * This script:
 * 1. Adds new columns to daily_entries table for improved sleep tracking
 * 2. Preserves existing data
 * 3. Sets default values for new columns
 */

import { pool } from './server/db';

async function migrateDatabase() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting migration for sleep tracking enhancements...');
    
    // Check if columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'daily_entries' 
      AND column_name IN ('actual_sleep_hours', 'predicted_sleep_hours', 'sleep_quality', 'export_flag', 'notes');
    `;
    
    const { rows } = await client.query(checkColumnsQuery);
    const existingColumns = rows.map(row => row.column_name);
    
    // Add columns if they don't exist
    if (!existingColumns.includes('actual_sleep_hours')) {
      console.log('Adding actual_sleep_hours column...');
      await client.query(`
        ALTER TABLE daily_entries 
        ADD COLUMN actual_sleep_hours REAL DEFAULT 0
      `);
    }
    
    if (!existingColumns.includes('predicted_sleep_hours')) {
      console.log('Adding predicted_sleep_hours column...');
      await client.query(`
        ALTER TABLE daily_entries 
        ADD COLUMN predicted_sleep_hours REAL DEFAULT 0
      `);
    }
    
    if (!existingColumns.includes('sleep_quality')) {
      console.log('Adding sleep_quality column...');
      await client.query(`
        ALTER TABLE daily_entries 
        ADD COLUMN sleep_quality REAL DEFAULT 0
      `);
    }
    
    if (!existingColumns.includes('export_flag')) {
      console.log('Adding export_flag column...');
      await client.query(`
        ALTER TABLE daily_entries 
        ADD COLUMN export_flag BOOLEAN DEFAULT FALSE
      `);
    }
    
    if (!existingColumns.includes('notes')) {
      console.log('Adding notes column...');
      await client.query(`
        ALTER TABLE daily_entries 
        ADD COLUMN notes TEXT DEFAULT ''
      `);
    }
    
    // Initialize new columns based on existing data
    console.log('Initializing sleep data from existing records...');
    await client.query(`
      UPDATE daily_entries
      SET actual_sleep_hours = sleep_hours,
          predicted_sleep_hours = sleep_hours
      WHERE sleep_hours IS NOT NULL AND sleep_hours > 0
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully');
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Execute migration and then exit
migrateDatabase()
  .then(() => {
    console.log('Sleep tracking enhancement migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to migrate sleep tracking enhancements:', err);
    process.exit(1);
  });