const express = require('express');
const PushNotificationService = require('../services/pushNotificationService');
const User = require('../models/User');

const router = express.Router();
const pushService = new PushNotificationService();

// Auth middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// REGISTER DEVICE TOKEN FOR PUSH NOTIFICATIONS
router.post('/register-token', verifyToken, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token is required'
      });
    }

    // Use authenticated user
    const userId = req.user._id.toString();

    const result = await pushService.registerDeviceToken(userId, token, platform || 'unknown');
console.log('result', result)
    res.json({
      success: true,
      message: 'Device token registered successfully',
      data: {
        tokenCount: result.tokenCount,
        platform: platform || 'unknown'
      }
    });

  } catch (error) {
    console.error('Register device token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device token'
    });
  }
});

// GET USER'S DEVICE TOKENS
router.get('/tokens', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const tokens = await pushService.getUserDeviceTokens(userId);

    res.json({
      success: true,
      data: {
        tokenCount: tokens.length,
        tokens: tokens.map(token => ({
          token: token.substring(0, 10) + '...',
          platform: 'unknown' // Platform info would need to be stored separately
        }))
      }
    });

  } catch (error) {
    console.error('Get device tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device tokens'
    });
  }
});

// REMOVE DEVICE TOKEN
router.delete('/token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token is required'
      });
    }

    const userId = req.user._id.toString();
    await pushService.removeDeviceToken(userId, token);

    res.json({
      success: true,
      message: 'Device token removed successfully'
    });

  } catch (error) {
    console.error('Remove device token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove device token'
    });
  }
});

// TEST PUSH NOTIFICATION
router.post('/test', verifyToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    const userId = req.user._id.toString();

    const result = await pushService.testNotification(
      userId,
      title || 'Test Notification',
      body || 'This is a test push notification from Master AI'
    );

    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent successfully' : 'Failed to send test notification',
      data: result.results || { error: result.error }
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

module.exports = {pushRouter:router};