const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');

// Import models
const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');

const router = express.Router();

// Import auth middleware
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

// Initialize Passport strategies
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/social/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'email', 'picture.type(large)'],
  scope: ['pages_manage_posts', 'pages_read_engagement', 'publish_to_groups', 'instagram_basic', 'instagram_content_publish']
}, async (accessToken, refreshToken, profile, done) => {
  return done(null, { profile, accessToken, refreshToken });
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/social/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  return done(null, { profile, accessToken, refreshToken });
}));

passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: "/api/social/auth/linkedin/callback",
  scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
}, async (accessToken, refreshToken, profile, done) => {
  return done(null, { profile, accessToken, refreshToken });
}));

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: "/api/social/auth/twitter/callback"
}, async (token, tokenSecret, profile, done) => {
  return done(null, { profile, accessToken: token, tokenSecret });
}));

// Initialize passport
router.use(passport.initialize());

// Resolve userId from either ?userId= or ?token= (JWT)
function resolveUserId(req) {
  if (req.query.userId) return req.query.userId;
  if (req.query.token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET || 'your-secret-key');
      return decoded.userId || decoded.id;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Store user ID in session for OAuth callbacks
router.use((req, res, next) => {
  const userId = resolveUserId(req);
  if (userId) {
    req.session = req.session || {};
    req.session.pendingUserId = userId;
  }
  next();
});

// FACEBOOK AUTHENTICATION
router.get('/auth/facebook', (req, res, next) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID or token required' });
  }

  req.session = req.session || {};
  req.session.pendingUserId = userId;

  passport.authenticate('facebook', {
    scope: ['pages_manage_posts', 'pages_read_engagement', 'publish_to_groups', 'instagram_basic', 'instagram_content_publish']
  })(req, res, next);
});

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    const appScheme = process.env.APP_SCHEME || 'masterai';
    try {
      const { profile, accessToken } = req.user;
      const userId = req.session?.pendingUserId || req.session?.userId;

      if (!userId) {
        return res.redirect(`${appScheme}://social-connect?error=missing_user_id&platform=facebook`);
      }

      // Save Facebook account
      const socialAccount = await saveSocialAccount({
        userId,
        platform: 'facebook',
        profile,
        accessToken,
        accountType: 'personal'
      });

      // Also fetch and save Facebook pages
      await fetchAndSaveFacebookPages(userId, accessToken);

      res.redirect(`${appScheme}://social-connect?success=true&platform=facebook&accountId=${socialAccount._id}`);
    } catch (error) {
      console.error('Facebook callback error:', error);
      res.redirect(`${appScheme}://social-connect?error=facebook_connection_failed&platform=facebook`);
    }
  }
);

// INSTAGRAM AUTHENTICATION (via Facebook)
router.get('/auth/instagram', (req, res, next) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID or token required' });
  }

  req.session = req.session || {};
  req.session.pendingUserId = userId;
  req.session.platform = 'instagram';

  passport.authenticate('facebook', {
    scope: ['instagram_basic', 'instagram_content_publish', 'pages_show_list']
  })(req, res, next);
});

// LINKEDIN AUTHENTICATION
router.get('/auth/linkedin', (req, res, next) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID or token required' });
  }

  req.session = req.session || {};
  req.session.pendingUserId = userId;

  passport.authenticate('linkedin')(req, res, next);
});

router.get('/auth/linkedin/callback',
  passport.authenticate('linkedin', { session: false }),
  async (req, res) => {
    const appScheme = process.env.APP_SCHEME || 'masterai';
    try {
      const { profile, accessToken } = req.user;
      const userId = req.session?.pendingUserId || req.session?.userId;

      if (!userId) {
        return res.redirect(`${appScheme}://social-connect?error=missing_user_id&platform=linkedin`);
      }

      const socialAccount = await saveSocialAccount({
        userId,
        platform: 'linkedin',
        profile,
        accessToken,
        accountType: 'personal'
      });

      res.redirect(`${appScheme}://social-connect?success=true&platform=linkedin&accountId=${socialAccount._id}`);
    } catch (error) {
      console.error('LinkedIn callback error:', error);
      res.redirect(`${appScheme}://social-connect?error=linkedin_connection_failed&platform=linkedin`);
    }
  }
);

// TWITTER AUTHENTICATION
router.get('/auth/twitter', (req, res, next) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID or token required' });
  }

  req.session = req.session || {};
  req.session.pendingUserId = userId;

  passport.authenticate('twitter')(req, res, next);
});

router.get('/auth/twitter/callback',
  passport.authenticate('twitter', { session: false }),
  async (req, res) => {
    const appScheme = process.env.APP_SCHEME || 'masterai';
    try {
      const { profile, accessToken, tokenSecret } = req.user;
      const userId = req.session?.pendingUserId || req.session?.userId;

      if (!userId) {
        return res.redirect(`${appScheme}://social-connect?error=missing_user_id&platform=twitter`);
      }

      const socialAccount = await saveSocialAccount({
        userId,
        platform: 'twitter',
        profile,
        accessToken,
        tokenSecret,
        accountType: 'personal'
      });

      res.redirect(`${appScheme}://social-connect?success=true&platform=twitter&accountId=${socialAccount._id}`);
    } catch (error) {
      console.error('Twitter callback error:', error);
      res.redirect(`${appScheme}://social-connect?error=twitter_connection_failed&platform=twitter`);
    }
  }
);

// GET CONNECTED ACCOUNTS
router.get('/accounts', verifyToken, async (req, res) => {
  try {
    const accounts = await SocialAccount.find({
      userId: req.user._id,
      isActive: true
    }).select('-accessToken -refreshToken');

    // Group accounts by platform
    const groupedAccounts = accounts.reduce((acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push({
        id: account._id,
        accountId: account.accountId,
        accountName: account.accountName,
        username: account.username,
        profilePicture: account.profilePicture,
        accountType: account.accountType,
        isVerified: account.isVerified,
        lastConnected: account.lastConnected,
        permissions: account.permissions
      });
      return acc;
    }, {});

    res.json({
      success: true,
      accounts: groupedAccounts,
      totalAccounts: accounts.length
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connected accounts'
    });
  }
});

// DISCONNECT ACCOUNT
router.delete('/accounts/:accountId', verifyToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    account.isActive = false;
    await account.save();

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account'
    });
  }
});

// REFRESH ACCOUNT TOKEN
router.post('/accounts/:accountId/refresh', verifyToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Refresh token based on platform
    let refreshed = false;
    switch (account.platform) {
      case 'facebook':
        refreshed = await refreshFacebookToken(account);
        break;
      case 'linkedin':
        refreshed = await refreshLinkedInToken(account);
        break;
      // Twitter OAuth 1.0a doesn't use refresh tokens
      case 'twitter':
        refreshed = await verifyTwitterToken(account);
        break;
      default:
        throw new Error('Unsupported platform for token refresh');
    }

    if (refreshed) {
      await account.markConnected();
      res.json({
        success: true,
        message: 'Token refreshed successfully'
      });
    } else {
      throw new Error('Token refresh failed');
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
});

// Helper function to save social account
async function saveSocialAccount({ userId, platform, profile, accessToken, refreshToken = null, tokenSecret = null, accountType = 'personal' }) {
  const accountData = {
    userId,
    platform,
    accountId: profile.id,
    accountName: profile.displayName || profile.name || profile.username,
    username: profile.username || null,
    email: profile.emails?.[0]?.value || null,
    profilePicture: profile.photos?.[0]?.value || null,
    accountType,
    accessToken,
    refreshToken,
    isActive: true,
    isVerified: profile.verified || false,
    lastConnected: new Date(),
    permissions: profile.permissions || []
  };

  // For Twitter, store tokenSecret in platformData
  if (platform === 'twitter' && tokenSecret) {
    accountData.platformData = { tokenSecret };
  }

  const existingAccount = await SocialAccount.findByPlatformAccount(userId, platform, profile.id);

  if (existingAccount) {
    Object.assign(existingAccount, accountData);
    return await existingAccount.save();
  } else {
    const newAccount = new SocialAccount(accountData);
    return await newAccount.save();
  }
}

// Helper function to fetch and save Facebook pages
async function fetchAndSaveFacebookPages(userId, accessToken) {
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,picture,category,verification_status'
      }
    });

    const pages = response.data.data || [];

    for (const page of pages) {
      await saveSocialAccount({
        userId,
        platform: 'facebook',
        profile: {
          id: page.id,
          displayName: page.name,
          photos: [{ value: page.picture?.data?.url }],
          verified: page.verification_status === 'verified'
        },
        accessToken: page.access_token || accessToken,
        accountType: 'page'
      });
    }
  } catch (error) {
    console.error('Error fetching Facebook pages:', error);
  }
}

// Helper function to refresh Facebook token
async function refreshFacebookToken(account) {
  try {
    const currentToken = account.getDecryptedAccessToken();
    const response = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: currentToken
      }
    });

    if (response.data.access_token) {
      account.accessToken = response.data.access_token;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Facebook token refresh error:', error);
    return false;
  }
}

// Helper function to refresh LinkedIn token
async function refreshLinkedInToken(account) {
  try {
    const refreshToken = account.getDecryptedRefreshToken();
    if (!refreshToken) return false;

    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET
    });

    if (response.data.access_token) {
      account.accessToken = response.data.access_token;
      if (response.data.refresh_token) {
        account.refreshToken = response.data.refresh_token;
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('LinkedIn token refresh error:', error);
    return false;
  }
}

// Helper function to verify Twitter token
async function verifyTwitterToken(account) {
  try {
    const accessToken = account.getDecryptedAccessToken();
    const tokenSecret = account.platformData?.tokenSecret;

    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken,
      accessSecret: tokenSecret
    });

    const user = await client.v1.verifyCredentials();
    return !!user;
  } catch (error) {
    console.error('Twitter token verification error:', error);
    return false;
  }
}

module.exports = router;