const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
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

    // Verify token signature, issuer, and expiry — skip audience check because
    // @react-native-google-signin v9+ (One Tap) issues tokens with the Android
    // client ID as audience, not the web client ID.
    const ticket = await client.verifyIdToken({
      idToken: idToken,
    });

    // Confirm the token belongs to our Google project
    const payload = ticket.getPayload();
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      throw new Error('Invalid token issuer');
    }

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

// Helper: send OTP email via Gmail SMTP
async function sendOtpEmail(email, name, otp, type) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const isReset = type === 'password-reset';
  const subject = isReset ? 'Password Reset OTP - MasterAI' : 'Verify Your Email - MasterAI';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email Address';
  const body = isReset
    ? 'You requested a password reset. Use the OTP below to reset your password.'
    : 'Thank you for registering. Use the OTP below to verify your email address.';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr><td style="background:#4F46E5;padding:24px 32px;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">MasterAI</h1>
            </td></tr>
            <tr><td style="padding:32px;">
              <h2 style="color:#1a1a1a;margin:0 0 12px;">${heading}</h2>
              <p style="color:#555;line-height:1.6;">Hi ${name},</p>
              <p style="color:#555;line-height:1.6;">${body}</p>
              <div style="text-align:center;margin:32px 0;">
                <span style="display:inline-block;background:#4F46E5;color:#fff;font-size:32px;font-weight:bold;letter-spacing:10px;padding:16px 32px;border-radius:8px;">${otp}</span>
              </div>
              <p style="color:#888;font-size:13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
              <p style="color:#888;font-size:13px;margin-top:24px;">If you did not request this, please ignore this email.</p>
            </td></tr>
            <tr><td style="background:#f9f9f9;padding:16px 32px;text-align:center;">
              <p style="color:#aaa;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} MasterAI. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"MasterAI" <${process.env.MAIL_FROM}>`,
    to: email,
    subject,
    html
  });
}

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
      // Resend OTP for unverified user
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      existingUser.otpType = 'email-verification';
      await existingUser.save();
      await sendOtpEmail(normalizedEmail, existingUser.name, otp, 'email-verification');
      return res.status(200).json({ success: true, message: 'OTP resent', email: normalizedEmail });
    }

    const hashedPwd = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPwd,
      authProvider: 'email',
      emailVerified: false,
      otp,
      otpExpiry,
      otpType: 'email-verification',
      subscription: { plan: 'free', isActive: true },
      lastLogin: new Date()
    });

    await user.save();
    await initializeUserCredits(user._id);
    await sendOtpEmail(normalizedEmail, name, otp, 'email-verification');

    res.status(201).json({ success: true, message: 'OTP sent to email', email: normalizedEmail });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (user.otp !== otp || user.otpType !== 'email-verification') {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    user.emailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpType = null;
    await user.save();

    // Initialize credits if not already done
    const existingCredits = await Credit.findOne({ userId: user._id });
    if (!existingCredits) {
      await initializeUserCredits(user._id);
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), authProvider: 'email' });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your OTP.',
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
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
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpType = 'email-verification';
    await user.save();

    await sendOtpEmail(user.email, user.name, otp, 'email-verification');

    res.json({ success: true, message: 'OTP resent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
});

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), authProvider: 'email' });

    // Always return a generic message to avoid revealing if email exists
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, you will receive an OTP' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpType = 'password-reset';
    await user.save();

    await sendOtpEmail(user.email, user.name, otp, 'password-reset');

    res.json({ success: true, message: 'If this email is registered, you will receive an OTP' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    if (user.otp !== otp || user.otpType !== 'password-reset') {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiry = null;
    user.otpType = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

module.exports = { authRoutes:router, verifyToken };