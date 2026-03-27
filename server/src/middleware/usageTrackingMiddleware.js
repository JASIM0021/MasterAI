const User = require('../model/User');
const { verifyAuthToken } = require('../utils/authUtils');

/**
 * Middleware to track API usage for authenticated users
 * This middleware should be applied to routes that consume user quota
 */
const trackApiUsage = (options = {}) => {
  const {
    quotaType = 'general', // 'general', 'image_generation', 'caption_generation', etc.
    cost = 1, // How much quota this operation consumes
    requirePremium = false, // Whether this operation requires premium subscription
  } = options;

  return async (req, res, next) => {
    try {
      // Extract user info from request (should be added by auth middleware)
      const userId = req.body?.userId || req.user?.id;
      const userPlan = req.body?.userPlan || req.user?.subscription?.plan;

      if (!userId) {
        // If no user ID, skip tracking (for non-authenticated routes)
        return next();
      }

      // Find user in database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          status: 404
        });
      }

      // Check if user needs premium for this operation
      if (requirePremium && (!user.subscription || user.subscription.plan === 'free')) {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a premium subscription',
          status: 403,
          upgradeRequired: true
        });
      }

      // Check quota limits for free users
      if (user.subscription?.plan === 'free' || !user.subscription) {
        const quotaLimits = getQuotaLimits(quotaType);
        const currentUsage = user.apiUsage?.currentMonthUsage || 0;

        if (currentUsage >= quotaLimits.free) {
          return res.status(429).json({
            success: false,
            message: `Monthly ${quotaType} limit reached. Upgrade to premium for unlimited access.`,
            status: 429,
            quotaExceeded: true,
            currentUsage,
            limit: quotaLimits.free,
            upgradeRequired: true
          });
        }

        // Warn user when approaching limit
        const remaining = quotaLimits.free - currentUsage;
        if (remaining <= 3) {
          res.locals.quotaWarning = {
            remaining,
            total: quotaLimits.free,
            quotaType
          };
        }
      }

      // Add user to request for downstream middleware
      req.user = user;
      req.apiCost = cost;
      req.quotaType = quotaType;

      next();

    } catch (error) {
      console.error('Usage tracking middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking API usage',
        status: 500
      });
    }
  };
};

/**
 * Middleware to update usage after successful API call
 * Should be called after the main API operation succeeds
 */
const updateUsageAfterSuccess = async (req, res, next) => {
  try {
    if (req.user && req.apiCost) {
      await req.user.incrementApiUsage();

      // Add usage info to response
      const remainingQuota = getRemainingQuota(req.user, req.quotaType);
      res.locals.usageInfo = {
        currentUsage: req.user.apiUsage.currentMonthUsage,
        remainingQuota,
        quotaType: req.quotaType
      };
    }

    next();
  } catch (error) {
    console.error('Usage update error:', error);
    // Don't fail the request if usage update fails
    next();
  }
};

/**
 * Get quota limits for different operation types
 */
const getQuotaLimits = (quotaType) => {
  const limits = {
    general: {
      free: 20,
      premium: -1, // -1 means unlimited
      admin: -1
    },
    image_generation: {
      free: 10,
      premium: -1,
      admin: -1
    },
    caption_generation: {
      free: 15,
      premium: -1,
      admin: -1
    },
    ai_image_edit: {
      free: 5,
      premium: -1,
      admin: -1
    },
    post_generation: {
      free: 10,
      premium: -1,
      admin: -1
    }
  };

  return limits[quotaType] || limits.general;
};

/**
 * Get remaining quota for a user
 */
const getRemainingQuota = (user, quotaType) => {
  const plan = user.subscription?.plan || 'free';
  const limits = getQuotaLimits(quotaType);
  const limit = limits[plan] || limits.free;

  if (limit === -1) {
    return -1; // Unlimited
  }

  const currentUsage = user.apiUsage?.currentMonthUsage || 0;
  return Math.max(0, limit - currentUsage);
};

/**
 * Check if user can perform operation
 */
const canUserPerformOperation = async (userId, quotaType, cost = 1) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    const plan = user.subscription?.plan || 'free';
    const limits = getQuotaLimits(quotaType);
    const limit = limits[plan] || limits.free;

    if (limit === -1) return true; // Unlimited

    const currentUsage = user.apiUsage?.currentMonthUsage || 0;
    return currentUsage + cost <= limit;

  } catch (error) {
    console.error('Error checking user operation permission:', error);
    return false;
  }
};

/**
 * Get user usage statistics
 */
const getUserUsageStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const plan = user.subscription?.plan || 'free';
    const currentUsage = user.apiUsage?.currentMonthUsage || 0;
    const totalCalls = user.apiUsage?.totalCalls || 0;
    const lastApiCall = user.apiUsage?.lastApiCall;

    const quotaTypes = ['general', 'image_generation', 'caption_generation', 'ai_image_edit', 'post_generation'];
    const quotaInfo = {};

    quotaTypes.forEach(type => {
      const limits = getQuotaLimits(type);
      const limit = limits[plan] || limits.free;

      quotaInfo[type] = {
        limit: limit === -1 ? 'Unlimited' : limit,
        remaining: limit === -1 ? 'Unlimited' : Math.max(0, limit - currentUsage),
        isUnlimited: limit === -1
      };
    });

    return {
      userId,
      plan,
      currentUsage,
      totalCalls,
      lastApiCall,
      quotaInfo
    };

  } catch (error) {
    console.error('Error getting user usage stats:', error);
    return null;
  }
};

module.exports = {
  trackApiUsage,
  updateUsageAfterSuccess,
  getQuotaLimits,
  getRemainingQuota,
  canUserPerformOperation,
  getUserUsageStats
};