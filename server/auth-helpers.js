// Helper functions for authentication
const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  try {
    console.log(`Comparing supplied password with stored hash: ${stored.substring(0, 20)}...`);
    const [hashed, salt] = stored.split('.');
    if (!hashed || !salt) {
      console.error('Invalid stored password format - missing hash or salt');
      return false;
    }
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    const result = crypto.timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Password comparison result: ${result}`);
    return result;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

module.exports = {
  hashPassword,
  comparePasswords
};