const jwt = require('jsonwebtoken');

// Create a test token with a fake user ID
const testPayload = {
  userId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId format
  email: 'test@example.com',
  name: 'Test User'
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse this token in Authorization header as:');
console.log(`Bearer ${token}`);