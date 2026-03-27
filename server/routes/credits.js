const express = require('express');
const User = require('../models/User');
const Credit = require('../models/Credit');
const creditResetService = require('../services/creditResetService');
const adRewardService = require('../services/AdRewardService');
const { verifyToken } = require('./auth');

const router = express.Router();

// Middleware to check if user is admin (you'll need to implement this based on your auth system)
const requireAdmin = (req, res, next) => {
  // Check if user has admin role
  if (!req.user || (req.user.role !== 'admin' && req.user.subscription?.plan !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// GET ALL USER'S CREDITS (GLOBAL CREDIT SYSTEM)
router.get('/', verifyToken, async (req, res) => {
  try {
    const credits = await Credit.findOrCreateForUser(req.user._id);
    const globalCreditInfo = credits.getGlobalCreditInfo();

    res.json({
      success: true,
      globalCredits: {
        balance: globalCreditInfo.balance,
        lastMonthlyAddition: globalCreditInfo.lastMonthlyAddition,
        totalEarned: globalCreditInfo.totalEarned,
        totalSpent: globalCreditInfo.totalSpent,
        nextMonthlyAddition: globalCreditInfo.nextMonthlyAddition
      },
      serviceCosts: {
        postGeneration: credits.getServiceCost('postGeneration'),
        captionGeneration: credits.getServiceCost('captionGeneration'),
        automation: credits.getServiceCost('automation'),
        execution: credits.getServiceCost('execution'),
        executionWithImage: credits.getServiceCost('executionWithImage')
      },
      canAfford: {
        postGeneration: credits.canUseGlobalService('postGeneration'),
        captionGeneration: credits.canUseGlobalService('captionGeneration'),
        automation: credits.canUseGlobalService('automation'),
        execution: credits.canUseGlobalService('execution'),
        executionWithImage: credits.canUseGlobalService('executionWithImage')
      },
      lastUpdated: credits.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Get user credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit information'
    });
  }
});

// DEDUCT GLOBAL CREDITS FOR A SERVICE
router.post('/deduct', verifyToken, async (req, res) => {
  try {
    const { service, customCost } = req.body;

    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }

    const credits = await Credit.findOrCreateForUser(req.user._id);

    // Check if user has enough global credits
    const hasCredits = credits.canUseGlobalService(service, customCost);
    if (!hasCredits) {
      const serviceCost = customCost || credits.getServiceCost(service);
      return res.status(402).json({
        success: false,
        message: `Insufficient global credits. Need ${serviceCost} credits for ${service}. Available: ${credits.globalCredits.balance}`,
        errorCode: 'INSUFFICIENT_CREDITS',
        creditsNeeded: serviceCost,
        creditsAvailable: credits.globalCredits.balance
      });
    }

    // Deduct global credits
    await credits.deductGlobalCredits(service, customCost);
    const globalCreditInfo = credits.getGlobalCreditInfo();

    res.json({
      success: true,
      service,
      creditsDeducted: customCost || credits.getServiceCost(service),
      globalCredits: globalCreditInfo
    });
  } catch (error) {
    console.error('Deduct credit error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to deduct credit'
    });
  }
});

// CHECK GLOBAL SERVICE ACCESS
router.get('/check/:service', verifyToken, async (req, res) => {
  try {
    const { service } = req.params;
    const { customCost } = req.query;
    const credits = await Credit.findOrCreateForUser(req.user._id);

    const canAccess = credits.canUseGlobalService(service, customCost ? parseInt(customCost) : null);
    const serviceCost = customCost ? parseInt(customCost) : credits.getServiceCost(service);
    const globalBalance = credits.globalCredits.balance;

    res.json({
      success: true,
      canAccess,
      serviceCost,
      globalCreditsAvailable: globalBalance,
      reason: canAccess ? null : `Insufficient global credits. Need ${serviceCost} credits, have ${globalBalance}`
    });
  } catch (error) {
    console.error('Check service access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check service access'
    });
  }
});

// GET USER'S GLOBAL CREDIT INFORMATION
router.get('/my-credits', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const creditInfo = await user.getCreditInfo();

    res.json({
      success: true,
      credits: creditInfo
    });
  } catch (error) {
    console.error('Get user credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit information'
    });
  }
});

// GET USER'S AUTOMATION CREDIT INFORMATION (GLOBAL CREDITS)
router.get('/automation', verifyToken, async (req, res) => {
  try {
    const credits = await Credit.findOrCreateForUser(req.user._id);
    const globalCreditInfo = credits.getGlobalCreditInfo();

    const automationCost = credits.getServiceCost('automation');
    const executionCost = credits.getServiceCost('execution');
    const executionWithImageCost = credits.getServiceCost('executionWithImage');

    res.json({
      success: true,
      globalCredits: globalCreditInfo,
      automationCosts: {
        creation: automationCost,
        executionText: executionCost,
        executionWithImage: executionWithImageCost
      },
      canAfford: {
        createAutomation: credits.canUseGlobalService('automation'),
        executeText: credits.canUseGlobalService('execution'),
        executeWithImage: credits.canUseGlobalService('executionWithImage')
      }
    });
  } catch (error) {
    console.error('Get automation credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch automation credit information'
    });
  }
});

// GET CREDIT STATISTICS (Admin only)
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await creditResetService.getCreditStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get credit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit statistics'
    });
  }
});

// GET USERS APPROACHING CREDIT LIMIT (Admin only)
router.get('/approaching-limit', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { threshold = 0.8 } = req.query;
    const users = await creditResetService.getUsersApproachingLimit(parseFloat(threshold));

    res.json({
      success: true,
      users,
      threshold: parseFloat(threshold)
    });
  } catch (error) {
    console.error('Get users approaching limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users approaching limit'
    });
  }
});

// MANUALLY RESET USER CREDITS (Admin only)
router.post('/reset/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const creditInfo = await creditResetService.resetUserCredits(userId);

    res.json({
      success: true,
      message: 'User credits reset successfully',
      creditInfo
    });
  } catch (error) {
    console.error('Manual credit reset error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset user credits'
    });
  }
});

// UPDATE USER CREDIT LIMIT (Admin only)
router.put('/limit/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newLimit } = req.body;

    if (!newLimit || newLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid newLimit is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldLimit = user.credits.automation.total;
    user.credits.automation.total = newLimit;
    user.markModified('credits.automation');
    await user.save();

    const creditInfo = user.getCreditInfo();

    res.json({
      success: true,
      message: `Credit limit updated from ${oldLimit} to ${newLimit}`,
      creditInfo
    });
  } catch (error) {
    console.error('Update credit limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update credit limit'
    });
  }
});

// BULK UPDATE CREDIT LIMITS (Admin only)
router.put('/bulk-limit', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { criteria, newLimit } = req.body;

    if (!newLimit || newLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid newLimit is required'
      });
    }

    if (!criteria || typeof criteria !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid criteria object is required'
      });
    }

    const result = await creditResetService.updateCreditLimits(criteria, newLimit);

    res.json({
      success: true,
      message: `Updated credit limits for ${result.modifiedCount} users`,
      result: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk update credit limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update credit limits'
    });
  }
});

// MANUALLY TRIGGER CREDIT RESET FOR EXPIRED USERS (Admin only)
router.post('/reset-expired', verifyToken, requireAdmin, async (req, res) => {
  try {
    const resetCount = await creditResetService.checkAndResetExpiredCredits();

    res.json({
      success: true,
      message: `Reset credits for ${resetCount} users with expired periods`,
      resetCount
    });
  } catch (error) {
    console.error('Reset expired credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset expired credits'
    });
  }
});

// MANUALLY TRIGGER MONTHLY GLOBAL CREDIT ADDITION (Admin only)
router.post('/add-monthly-credits', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await creditResetService.addMonthlyGlobalCredits();

    res.json({
      success: true,
      message: result.message,
      totalUsers: result.totalUsers,
      successful: result.successful,
      errors: result.errors
    });
  } catch (error) {
    console.error('Add monthly credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add monthly credits'
    });
  }
});

// UPDATE USER'S CREDIT RESET INTERVAL (Admin only)
router.put('/interval/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { interval } = req.body;

    const validIntervals = ['monthly', 'weekly', 'yearly'];
    if (!interval || !validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldInterval = user.credits.automation.resetInterval;
    user.credits.automation.resetInterval = interval;

    // Recalculate reset date based on new interval
    const now = new Date();
    const nextReset = new Date();

    switch (interval) {
      case 'weekly':
        nextReset.setDate(nextReset.getDate() + 7);
        break;
      case 'monthly':
        nextReset.setMonth(nextReset.getMonth() + 1);
        nextReset.setDate(1);
        nextReset.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        nextReset.setFullYear(nextReset.getFullYear() + 1);
        nextReset.setMonth(0);
        nextReset.setDate(1);
        nextReset.setHours(0, 0, 0, 0);
        break;
    }

    user.credits.automation.resetDate = nextReset;
    user.markModified('credits.automation');
    await user.save();

    const creditInfo = user.getCreditInfo();

    res.json({
      success: true,
      message: `Reset interval updated from ${oldInterval} to ${interval}`,
      creditInfo
    });
  } catch (error) {
    console.error('Update reset interval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reset interval'
    });
  }
});

// GET ALL USERS WITH CREDIT INFORMATION (Admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find({})
      .select('name email credits.automation subscription.plan role createdAt')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalUsers = await User.countDocuments();

    const usersWithCreditInfo = users.map(user => {
      const creditInfo = user.getCreditInfo();
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.subscription?.plan || user.role || 'free',
        credits: creditInfo,
        createdAt: user.createdAt
      };
    });

    res.json({
      success: true,
      users: usersWithCreditInfo,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page * limit < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users with credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users with credit information'
    });
  }
});

// =================== AD REWARD ENDPOINTS ===================

// INITIATE AD WATCHING SESSION
router.post('/watch-ad', verifyToken, async (req, res) => {
  try {
    const { adType, adUnitId, source, deviceInfo, location } = req.body;

    // Validate required fields
    if (!adType || !adUnitId || !source) {
      return res.status(400).json({
        success: false,
        message: 'adType, adUnitId, and source are required'
      });
    }

    // Validate adType
    if (!['rewarded', 'rewarded_interstitial'].includes(adType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid adType. Must be "rewarded" or "rewarded_interstitial"'
      });
    }

    // Validate source
    const validSources = ['profile', 'credit_purchase', 'low_credit_warning', 'main_screen', 'ai_generation'];
    if (!validSources.includes(source)) {
      return res.status(400).json({
        success: false,
        message: `Invalid source. Must be one of: ${validSources.join(', ')}`
      });
    }

    // Check user eligibility
    const eligibility = await adRewardService.checkAdEligibility(req.user._id);
    if (!eligibility.isEligible) {
      return res.status(403).json({
        success: false,
        message: eligibility.reason
      });
    }

    // Initiate ad session
    const result = await adRewardService.initiateAdSession(req.user._id, {
      adType,
      adUnitId,
      source,
      deviceInfo: deviceInfo || {},
      location: location || {}
    });

    res.json(result);

  } catch (error) {
    console.error('Watch ad initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate ad session'
    });
  }
});

// UPDATE AD LOADING STATUS
router.put('/ad-session/:sessionId/loading', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const loadData = req.body;

    const result = await adRewardService.updateAdLoading(sessionId, loadData);
    res.json(result);

  } catch (error) {
    console.error('Ad loading update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update ad loading status'
    });
  }
});

// START AD PLAYBACK
router.put('/ad-session/:sessionId/start', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await adRewardService.startAdPlayback(sessionId);
    res.json(result);

  } catch (error) {
    console.error('Ad playback start error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start ad playback'
    });
  }
});

// COMPLETE AD AND CLAIM REWARD
router.post('/claim-ad-reward', verifyToken, async (req, res) => {
  try {
    const { sessionId, watchDuration, adClicked = false, userSkipped = false } = req.body;

    // Validate required fields
    if (!sessionId || watchDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and watchDuration are required'
      });
    }

    if (watchDuration < 0) {
      return res.status(400).json({
        success: false,
        message: 'watchDuration must be a positive number'
      });
    }

    // Complete ad session and award credits
    const result = await adRewardService.completeAdSession(sessionId, {
      watchDuration,
      adClicked,
      userSkipped
    });

    res.json(result);

  } catch (error) {
    console.error('Claim ad reward error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to claim ad reward'
    });
  }
});

// HANDLE AD FAILURE
router.post('/ad-session/:sessionId/failed', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { errorCode, errorMessage, watchDuration = 0 } = req.body;

    const result = await adRewardService.handleAdFailure(sessionId, {
      errorCode,
      errorMessage,
      watchDuration
    });

    res.json(result);

  } catch (error) {
    console.error('Ad failure handling error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to handle ad failure'
    });
  }
});

// CHECK AD ELIGIBILITY
router.get('/ad-eligibility', verifyToken, async (req, res) => {
  try {
    const eligibility = await adRewardService.checkAdEligibility(req.user._id);
    res.json({
      success: true,
      ...eligibility
    });

  } catch (error) {
    console.error('Check ad eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ad eligibility'
    });
  }
});

// GET USER'S AD STATISTICS
router.get('/ad-stats', verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await adRewardService.getUserAdStats(req.user._id, parseInt(days));

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get ad stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ad statistics'
    });
  }
});

// GET AD SESSION DETAILS
router.get('/ad-session/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionDetails = await adRewardService.getAdSession(sessionId);

    res.json({
      success: true,
      session: sessionDetails
    });

  } catch (error) {
    console.error('Get ad session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get ad session details'
    });
  }
});

// GET GLOBAL AD STATISTICS (Admin only)
router.get('/ad-stats-global', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await adRewardService.getGlobalAdStats(parseInt(days));

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get global ad stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch global ad statistics'
    });
  }
});

module.exports = router;