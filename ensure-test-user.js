// Script to ensure a test user exists in the database

import { storage } from './server/storage.js';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function createHashedPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function ensureTestUser() {
  try {
    const username = 'testuser';
    const password = 'password123';
    const email = 'test@example.com';
    
    console.log('Checking if test user exists...');
    const existingUser = await storage.getUserByUsername(username);
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser.id);
      return existingUser;
    }
    
    console.log('Creating test user...');
    // Create hashed password
    const hashedPassword = await createHashedPassword(password);
    
    // Create the user
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      email,
      name: 'Test User',
      emailReminders: true
    });
    
    console.log('Test user created:', user.id);
    
    // Setup default categories
    await storage.setupDefaultCategories(user.id);
    console.log('Default categories set up for test user');
    
    return user;
  } catch (error) {
    console.error('Error ensuring test user:', error);
    throw error;
  }
}

ensureTestUser()
  .then(user => {
    console.log('Test user setup complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to set up test user:', error);
    process.exit(1);
  });