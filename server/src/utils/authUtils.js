const crypto = require('crypto');

/**
 * Generate a simple auth token (you might want to use JWT in production)
 * @param {string} userId - User ID
 * @returns {string} - Generated token
 */
const generateAuthToken = (userId) => {
  const timestamp = Date.now().toString();
  const randomString = crypto.randomBytes(16).toString('hex');
  const userIdString = userId.toString();

  // Create a simple token by combining userId, timestamp, and random string
  const tokenData = `${userIdString}:${timestamp}:${randomString}`;

  // Encode it with base64
  const token = Buffer.from(tokenData).toString('base64');

  return token;
};

/**
 * Verify and decode an auth token
 * @param {string} token - Token to verify
 * @returns {object|null} - Decoded token data or null if invalid
 */
const verifyAuthToken = (token) => {
  try {
    // Decode from base64
    const tokenData = Buffer.from(token, 'base64').toString();
    const [userId, timestamp, randomString] = tokenData.split(':');

    if (!userId || !timestamp || !randomString) {
      return null;
    }

    // Check if token is not too old (optional - set expiry time)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (tokenAge > maxAge) {
      return null; // Token expired
    }

    return {
      userId,
      timestamp: parseInt(timestamp),
      isValid: true
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Hash a password using crypto (for email auth if needed later)
 * @param {string} password - Plain text password
 * @param {string} salt - Salt for hashing
 * @returns {string} - Hashed password
 */
const hashPassword = (password, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }

  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
};

/**
 * Verify a password against its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Stored hashed password
 * @returns {boolean} - Whether password is correct
 */
const verifyPassword = (password, hashedPassword) => {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    return hash === hashToVerify.toString('hex');
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

/**
 * Generate a random API key
 * @returns {string} - Generated API key
 */
const generateApiKey = () => {
  const timestamp = Date.now().toString();
  const randomString = crypto.randomBytes(32).toString('hex');
  return `mk_${timestamp}_${randomString}`;
};

/**
 * Generate a secure random string
 * @param {number} length - Length of the random string
 * @returns {string} - Random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

/**
 * Create a simple session token
 * @param {string} userId - User ID
 * @param {object} data - Additional session data
 * @returns {string} - Session token
 */
const createSessionToken = (userId, data = {}) => {
  const sessionData = {
    userId,
    timestamp: Date.now(),
    ...data
  };

  const sessionString = JSON.stringify(sessionData);
  return Buffer.from(sessionString).toString('base64');
};

/**
 * Verify and decode a session token
 * @param {string} token - Session token
 * @returns {object|null} - Session data or null if invalid
 */
const verifySessionToken = (token) => {
  try {
    const sessionString = Buffer.from(token, 'base64').toString();
    const sessionData = JSON.parse(sessionString);

    // Check if session is not too old
    const sessionAge = Date.now() - sessionData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (sessionAge > maxAge) {
      return null; // Session expired
    }

    return sessionData;
  } catch (error) {
    console.error('Session token verification error:', error);
    return null;
  }
};

module.exports = {
  generateAuthToken,
  verifyAuthToken,
  hashPassword,
  verifyPassword,
  generateApiKey,
  generateRandomString,
  createSessionToken,
  verifySessionToken
};