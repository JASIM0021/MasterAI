const express = require('express');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001; // Use a different port to avoid conflicts

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'master-ai-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Social test server is running',
    timestamp: new Date().toISOString()
  });
});

// Social routes
app.use('/api/social', require('./routes/social'));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Social test server is running on port ${PORT}`);
  console.log(`📱 Test URL: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Facebook OAuth URL: http://localhost:${PORT}/api/social/auth/facebook?userId=TEST_USER_ID`);
});

module.exports = app;