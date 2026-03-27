const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Credit = require('../models/Credit');
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    // console.log('authHeader', authHeader)

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    // console.log('decoded', decoded)
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    // console.log('user', user)
    req.user = user;
    next();
  } catch (error) {
    // console.error('Token verification failed:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { idToken, user: userInfo } = req.body;

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;

    // Check if user exists
    let user = await User.findOne({
      $or: [
        { googleId: googleId },
        { email: payload.email }
      ]
    });

    if (!user) {
      // Create new user
      user = new User({
        googleId: googleId,
        name: payload.name,
        email: payload.email,
        profilePicture: payload.picture,
        emailVerified: payload.email_verified,
        authProvider: 'google',
        subscription: {
          plan: 'free',
          isActive: true
        },
        lastLogin: new Date()
      });

      await user.save();

      // Initialize credits for new user
      await initializeUserCredits(user._id);
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = await jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // console.log('token', token)
    // const decoded = await  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    res.json({
      success: true,
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        lastLogin: user.lastLogin,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Google auth error:', error.message);
    console.error('Error details:', {
      name: error.name,
      stack: error.stack?.split('\n')[0],
      idTokenReceived: !!req.body.idToken,
      userInfoReceived: !!req.body.user
    });
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed'
    });
  }
});

// Get user credits
router.get('/credits', verifyToken, async (req, res) => {
  try {
    let credits = await Credit.findOne({ userId: req.user._id });

    if (!credits) {
      // Initialize credits if they don't exist
      credits = await initializeUserCredits(req.user._id);
    }

    res.json({
      success: true,
      credits: {
        postGeneration: {
          used: credits.postGeneration.used,
          total: req.user.subscription.plan === 'premium' ? -1 : credits.postGeneration.total
        },
        captionGeneration: {
          used: credits.captionGeneration.used,
          total: req.user.subscription.plan === 'premium' ? -1 : credits.captionGeneration.total
        },
        aiImageEdit: {
          used: credits.aiImageEdit.used,
          total: req.user.subscription.plan === 'premium' ? -1 : credits.aiImageEdit.total
        },
        aiImageGeneration: {
          used: credits.aiImageGeneration.used,
          total: req.user.subscription.plan === 'premium' ? -1 : credits.aiImageGeneration.total
        },
        lastUpdated: credits.updatedAt
      }
    });

  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credits'
    });
  }
});

// Deduct global credits for a service
router.post('/credits/deduct', verifyToken, async (req, res) => {
  try {
    const { service } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service parameter is required'
      });
    }

    // Validate service parameter
    const validServices = ['postGeneration', 'captionGeneration', 'aiImageEdit', 'aiImageGeneration',
                          'videoGeneration', 'automation', 'execution', 'executionWithImage'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service. Valid services are: ${validServices.join(', ')}`,
        errorCode: 'INVALID_SERVICE'
      });
    }

    // Get the full User model instance instead of using plain req.user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Premium users have unlimited access
    if (user.subscription.plan === 'premium') {
      return res.json({
        success: true,
        message: 'Premium user - unlimited access',
        credits: await user.getCreditInfo()
      });
    }

    // Check if user has enough global credits for the service
    let hasCredits;
    try {
      hasCredits = await user.hasGlobalCredits(service);
    } catch (creditCheckError) {
      console.error('Error checking user credits:', creditCheckError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check credit availability',
        errorCode: 'CREDIT_CHECK_ERROR'
      });
    }

    if (!hasCredits) {
      try {
        const availableCredits = await user.getAvailableGlobalCredits();
        const credits = await Credit.findOrCreateForUser(user._id);
        const serviceCost = credits.getServiceCost(service);

        return res.status(402).json({
          success: false,
          message: `Insufficient global credits. Need ${serviceCost} credits for ${service}. Available: ${availableCredits}`,
          errorCode: 'INSUFFICIENT_CREDITS',
          creditsNeeded: serviceCost,
          creditsAvailable: availableCredits
        });
      } catch (creditInfoError) {
        console.error('Error getting credit information:', creditInfoError);
        return res.status(500).json({
          success: false,
          message: 'Failed to get credit information',
          errorCode: 'CREDIT_INFO_ERROR'
        });
      }
    }

    // Deduct global credits for the service
    try {
      await user.consumeGlobalCredits(service);
      const remainingCredits = await user.getAvailableGlobalCredits();

      res.json({
        success: true,
        message: 'Global credits deducted successfully',
        credits: await user.getCreditInfo(),
        remainingCredits: remainingCredits
      });
    } catch (creditError) {
      return res.status(500).json({
        success: false,
        message: `Failed to process credits: ${creditError.message}`,
        errorCode: 'CREDIT_PROCESSING_ERROR'
      });
    }

  } catch (error) {
    console.error('Deduct credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deduct credit'
    });
  }
});

// Reset credits (admin only or for testing)
router.post('/credits/reset', verifyToken, async (req, res) => {
  try {
    await Credit.findOneAndUpdate(
      { userId: req.user._id },
      {
        postGeneration: { used: 0, total: 50 },
        captionGeneration: { used: 0, total: 50 },
        aiImageEdit: { used: 0, total: 50 },
        aiImageGeneration: { used: 0, total: 50 },
        updatedAt: new Date()
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Credits reset successfully',
      credits: await getUserCreditsResponse(req.user._id, req.user.subscription.plan)
    });

  } catch (error) {
    console.error('Reset credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset credits'
    });
  }
});

// Helper function to initialize user credits
async function initializeUserCredits(userId) {
  const credits = new Credit({
    userId: userId,
    postGeneration: { used: 0, total: 50 },
    captionGeneration: { used: 0, total: 50 },
    aiImageEdit: { used: 0, total: 50 },
    aiImageGeneration: { used: 0, total: 50 }
  });

  await credits.save();
  return credits;
}

// FCM Token Registration
router.post('/fcm/register-token', verifyToken, async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    console.log(`Registering FCM token for user ${req.user._id}:`, fcmToken.substring(0, 20) + '...');

    // Check if token already exists for this user
    const existingTokenIndex = req.user.deviceTokens.findIndex(
      device => device.token === fcmToken
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      req.user.deviceTokens[existingTokenIndex].lastUsed = new Date();
      req.user.deviceTokens[existingTokenIndex].platform = platform || 'unknown';
    } else {
      // Add new token
      req.user.deviceTokens.push({
        token: fcmToken,
        platform: platform || 'unknown',
        registeredAt: new Date(),
        lastUsed: new Date()
      });
    }

    // Clean up old tokens (keep only last 5 per user)
    if (req.user.deviceTokens.length > 5) {
      req.user.deviceTokens = req.user.deviceTokens
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, 5);
    }

    await req.user.save();

    console.log(`FCM token registered successfully for user ${req.user._id}`);

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      tokenCount: req.user.deviceTokens.length
    });

  } catch (error) {
    console.error('FCM token registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token'
    });
  }
});

// Remove FCM Token
router.post('/fcm/remove-token', verifyToken, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Remove token from user's device tokens
    req.user.deviceTokens = req.user.deviceTokens.filter(
      device => device.token !== fcmToken
    );

    await req.user.save();

    res.json({
      success: true,
      message: 'FCM token removed successfully',
      tokenCount: req.user.deviceTokens.length
    });

  } catch (error) {
    console.error('FCM token removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token'
    });
  }
});

// Helper function to get formatted credits response
async function getUserCreditsResponse(userId, plan) {
  const credits = await Credit.findOne({ userId });

  return {
    postGeneration: {
      used: credits.postGeneration.used,
      total: plan === 'premium' ? -1 : credits.postGeneration.total
    },
    captionGeneration: {
      used: credits.captionGeneration.used,
      total: plan === 'premium' ? -1 : credits.captionGeneration.total
    },
    aiImageEdit: {
      used: credits.aiImageEdit.used,
      total: plan === 'premium' ? -1 : credits.aiImageEdit.total
    },
    aiImageGeneration: {
      used: credits.aiImageGeneration.used,
      total: plan === 'premium' ? -1 : credits.aiImageGeneration.total
    },
    lastUpdated: credits.updatedAt
  };
}

module.exports = { authRoutes:router, verifyToken };