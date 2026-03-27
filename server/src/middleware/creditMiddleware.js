const jwt = require('jsonwebtoken');

// Import existing Credit model
const Credit = require('../../models/Credit');

const User = require('../../models/User');

/**
 * Service name mapping for credit tracking
 */
const SERVICE_MAPPING = {
  // Post generation endpoints
  'generateLinkdinPost': 'postGeneration',
  'generateFacebookPost': 'postGeneration',
  'generateTwitterPost': 'postGeneration',
  'generateInstagramPost': 'postGeneration',

  // Caption generation endpoints
  'generateCaption': 'captionGeneration',

  // AI image editing endpoints
  'editImage': 'aiImageEdit',
  'enhanceImage': 'aiImageEdit',
  'removeBackground': 'aiImageEdit',

  // AI image generation endpoints
  'generateImage': 'aiImageGeneration',
  'createImage': 'aiImageGeneration',
};

/**
 * Extract user information from request
 */
const extractUserFromRequest = async (req) => {
  // Try to get user from different sources
  let userId = null;
  let user = null;

  // Method 1: Check if user is already attached to request (from auth middleware)
  if (req.user) {
    user = req.user;
    userId = user._id || user.id;
  }

  // Method 2: Check Authorization header with Bearer token (JWT)
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded && decoded.userId) {
          userId = decoded.userId;
          user = await User.findById(userId);
        }
      } catch (error) {
        console.log('JWT token verification failed:', error.message);
      }
    }
  }

  // Method 3: Check request body for userId (from frontend)
  if (!userId && req.body && req.body.userId) {
    userId = req.body.userId;
    user = await User.findById(userId);
  }

  return { userId, user };
};

/**
 * Get service name from endpoint name or request
 */
const getServiceName = (req) => {
  // Try to get service from request body first
  if (req.body && req.body.service) {
    return req.body.service;
  }

  // Get the function name from the route path or endpoint
  const endpoint = req.route?.path || req.originalUrl;

  // Map common endpoints to services
  if (endpoint.includes('caption')) return 'captionGeneration';
  if (endpoint.includes('post') || endpoint.includes('linkdin') || endpoint.includes('facebook')) return 'postGeneration';
  if (endpoint.includes('edit') || endpoint.includes('enhance')) return 'aiImageEdit';
  if (endpoint.includes('generate') && endpoint.includes('image')) return 'aiImageGeneration';

  // Default fallback
  return 'postGeneration';
};

/**
 * Middleware to check and deduct credits before generation
 * Enhanced to support global credit system with legacy fallback
 */
const checkAndDeductCredit = (serviceName = null, customCost = null) => {
  return async (req, res, next) => {
    try {
      console.log('🔍 Credit middleware - Starting credit check...');

      // Extract user information
      const { userId, user } = await extractUserFromRequest(req);

      if (!userId) {
        console.log('❌ No user found - allowing request to proceed');
        // If no user found, let the request proceed (for backward compatibility)
        return next();
      }

      console.log(`✅ User found: ${user?.email || userId}`);

      // Check if user has premium access
      const isPremium = user?.subscription?.plan === 'premium' ||
                       user?.subscription?.plan === 'enterprise' ||
                       user?.role === 'premium';

      if (isPremium) {
        console.log('👑 Premium user - unlimited access');
        req.user = user; // Attach user to request for next middleware
        return next();
      }

      // Determine service name
      const service = serviceName || getServiceName(req);
      console.log(`🎯 Service: ${service}`);

      // Get or create user credits
      const credits = await Credit.findOrCreateForUser(userId);

      // ========== GLOBAL CREDIT SYSTEM ==========
      if (credits.isGlobalCreditsEnabled()) {
        console.log('🌐 Using global credit system');

        const serviceCost = customCost || credits.getServiceCost(service);
        if (serviceCost === 0) {
          console.log(`❌ Invalid service or no cost defined: ${service}`);
          return res.status(400).json({
            success: false,
            message: `Service ${service} is not available or cost not defined`,
            status: 400
          });
        }

        const currentBalance = credits.globalCredits.balance;
        console.log(`💳 Global Credits - Balance: ${currentBalance}, Cost: ${serviceCost}`);

        if (!credits.canUseGlobalService(service, customCost)) {
          console.log('🚫 Insufficient global credits');
          return res.status(403).json({
            success: false,
            message: `Insufficient credits. Required: ${serviceCost}, Available: ${currentBalance}`,
            status: 403,
            creditsRequired: serviceCost,
            creditsAvailable: currentBalance,
            creditType: 'global',
            upgradeRequired: true
          });
        }

        // Deduct global credits
        await credits.deductGlobalCredits(service, customCost);
        const newBalance = credits.globalCredits.balance;

        console.log(`✅ Global credits deducted - New balance: ${newBalance}`);

        // Attach user and credit info to request
        req.user = user;
        req.creditInfo = {
          type: 'global',
          service,
          cost: serviceCost,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          remaining: newBalance
        };

        return next();
      }

      // ========== LEGACY CREDIT SYSTEM (FALLBACK) ==========
      console.log('📚 Using legacy credit system');

      // Check if service exists in legacy system
      if (!credits[service]) {
        console.log(`❌ Invalid legacy service: ${service}`);
        return res.status(400).json({
          success: false,
          message: `Invalid service: ${service}`,
          status: 400
        });
      }

      // Check if user has remaining credits
      const serviceCredits = credits[service];
      const remaining = serviceCredits.total - serviceCredits.used;

      console.log(`💳 Legacy Credits - Used: ${serviceCredits.used}, Total: ${serviceCredits.total}, Remaining: ${remaining}`);

      if (serviceCredits.used >= serviceCredits.total) {
        console.log('🚫 No legacy credits remaining');
        return res.status(403).json({
          success: false,
          message: `No credits remaining for ${service}. Consider upgrading to Premium or purchasing credits.`,
          status: 403,
          creditsRemaining: 0,
          creditsTotal: serviceCredits.total,
          creditType: 'legacy',
          upgradeRequired: true,
          migrationAvailable: true // Suggest migration to global credits
        });
      }

      // Deduct legacy credit
      credits[service].used += 1;
      credits.updatedAt = new Date();
      await credits.save();

      console.log(`✅ Legacy credit deducted - Remaining: ${remaining - 1}`);

      // Attach user and credit info to request
      req.user = user;
      req.creditInfo = {
        type: 'legacy',
        service,
        cost: 1, // Legacy system always costs 1 credit
        remaining: remaining - 1,
        total: serviceCredits.total
      };

      next();

    } catch (error) {
      console.error('❌ Credit middleware error:', error);

      // Log error but don't block the request for backward compatibility
      console.log('⚠️ Credit check failed - allowing request to proceed');
      req.creditInfo = {
        type: 'error',
        error: error.message
      };
      next();
    }
  };
};

/**
 * Middleware to add credit info to response
 * Enhanced to support global and legacy credit systems
 */
const addCreditInfoToResponse = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // Add credit information to response if available
    if (req.creditInfo) {
      const creditInfo = req.creditInfo;

      if (creditInfo.type === 'global') {
        data.creditInfo = {
          type: 'global',
          service: creditInfo.service,
          cost: creditInfo.cost,
          balanceAfter: creditInfo.balanceAfter,
          remaining: creditInfo.remaining,
          message: creditInfo.remaining <= 10 ?
            `Low credit balance: ${creditInfo.remaining} credits remaining` :
            `${creditInfo.cost} credits used. ${creditInfo.remaining} credits remaining`,
          lowBalance: creditInfo.remaining <= 10,
          purchaseRecommended: creditInfo.remaining <= 5
        };
      } else if (creditInfo.type === 'legacy') {
        data.creditInfo = {
          type: 'legacy',
          service: creditInfo.service,
          cost: creditInfo.cost,
          remaining: creditInfo.remaining,
          total: creditInfo.total,
          message: creditInfo.remaining <= 5 ?
            `Only ${creditInfo.remaining} credits remaining for ${creditInfo.service}` :
            `${creditInfo.cost} credit used. ${creditInfo.remaining} credits remaining`,
          migrationAvailable: true,
          migrationMessage: 'Upgrade to global credits for better value and flexibility'
        };
      } else if (creditInfo.type === 'error') {
        data.creditInfo = {
          type: 'error',
          message: 'Credit check failed - proceeding without deduction',
          error: creditInfo.error
        };
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  checkAndDeductCredit,
  addCreditInfoToResponse,
  extractUserFromRequest,
  getServiceName,
  SERVICE_MAPPING
};