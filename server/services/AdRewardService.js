const { v4: uuidv4 } = require('uuid');
const AdReward = require('../models/AdReward');
const Credit = require('../models/Credit');
const CreditTransaction = require('../models/CreditTransaction');
const User = require('../models/User');

class AdRewardService {
  constructor() {
    this.DEFAULT_CREDITS_PER_AD = 5;
    this.AD_COMPLETION_THRESHOLD = 80; // Minimum completion percentage to earn reward
  }

  /**
   * Initiate an ad watching session
   * @param {string} userId - User ID
   * @param {Object} adData - Ad session data
   * @returns {Object} Ad session details
   */
  async initiateAdSession(userId, adData) {
    try {
      const { adType, adUnitId, source, deviceInfo, location } = adData;

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate unique session ID
      const sessionId = uuidv4();

      // Create ad reward record
      const adReward = new AdReward({
        userId,
        sessionId,
        adType,
        adUnitId,
        watchStartTime: new Date(),
        source,
        deviceInfo: deviceInfo || {},
        location: location || {},
        status: 'initiated'
      });

      await adReward.save();

      return {
        success: true,
        sessionId,
        adType,
        creditsToEarn: this.DEFAULT_CREDITS_PER_AD,
        message: 'Ad session initiated successfully'
      };

    } catch (error) {
      console.error('Error initiating ad session:', error);
      throw new Error(`Failed to initiate ad session: ${error.message}`);
    }
  }

  /**
   * Update ad session with loading status
   * @param {string} sessionId - Ad session ID
   * @param {Object} loadData - Ad loading data
   */
  async updateAdLoading(sessionId, loadData = {}) {
    try {
      const adReward = await AdReward.findOne({ sessionId });
      if (!adReward) {
        throw new Error('Ad session not found');
      }

      adReward.status = 'loading';
      adReward.adDuration = loadData.expectedDuration || 30; // Default 30 seconds

      await adReward.save();

      return {
        success: true,
        status: 'loading',
        message: 'Ad is loading'
      };

    } catch (error) {
      console.error('Error updating ad loading:', error);
      throw new Error(`Failed to update ad loading: ${error.message}`);
    }
  }

  /**
   * Start ad playback
   * @param {string} sessionId - Ad session ID
   */
  async startAdPlayback(sessionId) {
    try {
      const adReward = await AdReward.findOne({ sessionId });
      if (!adReward) {
        throw new Error('Ad session not found');
      }

      adReward.status = 'playing';
      adReward.watchStartTime = new Date(); // Update to actual playback start

      await adReward.save();

      return {
        success: true,
        status: 'playing',
        message: 'Ad playback started'
      };

    } catch (error) {
      console.error('Error starting ad playback:', error);
      throw new Error(`Failed to start ad playback: ${error.message}`);
    }
  }

  /**
   * Complete ad watching and award credits
   * @param {string} sessionId - Ad session ID
   * @param {Object} completionData - Ad completion data
   * @returns {Object} Completion result with credits awarded
   */
  async completeAdSession(sessionId, completionData) {
    try {
      const { watchDuration, adClicked = false, userSkipped = false } = completionData;

      // Find the ad session
      const adReward = await AdReward.findOne({ sessionId });
      if (!adReward) {
        throw new Error('Ad session not found');
      }

      if (adReward.rewardClaimed) {
        throw new Error('Reward already claimed for this session');
      }

      // Calculate completion rate
      const completionRate = adReward.adDuration > 0
        ? Math.min((watchDuration / adReward.adDuration) * 100, 100)
        : 100;

      // Update ad reward record
      await adReward.markCompleted(watchDuration);
      adReward.adClicked = adClicked;
      adReward.adSkipped = userSkipped;

      // Check if user qualifies for reward
      const qualifiesForReward = completionRate >= this.AD_COMPLETION_THRESHOLD && !userSkipped;

      if (!qualifiesForReward) {
        adReward.status = 'completed';
        await adReward.save();

        return {
          success: true,
          qualifiesForReward: false,
          completionRate,
          creditsAwarded: 0,
          message: `Ad completed but did not qualify for reward. Completion rate: ${completionRate.toFixed(1)}%`
        };
      }

      // Award credits
      const creditsAwarded = await this.awardCredits(adReward.userId, sessionId, {
        adType: adReward.adType,
        adUnitId: adReward.adUnitId,
        watchDuration,
        completionRate,
        source: adReward.source
      });

      // Mark reward as claimed
      await adReward.claimReward();

      // Get updated credit balance
      const userCredits = await Credit.findOne({ userId: adReward.userId });
      const newBalance = userCredits?.globalCredits?.balance || 0;

      return {
        success: true,
        qualifiesForReward: true,
        completionRate,
        creditsAwarded,
        newBalance,
        message: `Congratulations! You earned ${creditsAwarded} credits for watching the ad.`
      };

    } catch (error) {
      console.error('Error completing ad session:', error);
      throw new Error(`Failed to complete ad session: ${error.message}`);
    }
  }

  /**
   * Handle ad session failure
   * @param {string} sessionId - Ad session ID
   * @param {Object} errorData - Error information
   */
  async handleAdFailure(sessionId, errorData) {
    try {
      const { errorCode, errorMessage, watchDuration = 0 } = errorData;

      const adReward = await AdReward.findOne({ sessionId });
      if (!adReward) {
        throw new Error('Ad session not found');
      }

      await adReward.markFailed(errorCode, errorMessage);
      adReward.watchDuration = watchDuration;

      await adReward.save();

      return {
        success: true,
        status: 'failed',
        creditsAwarded: 0,
        message: 'Ad failed to complete. No credits awarded.'
      };

    } catch (error) {
      console.error('Error handling ad failure:', error);
      throw new Error(`Failed to handle ad failure: ${error.message}`);
    }
  }

  /**
   * Award credits to user and log transaction
   * @param {string} userId - User ID
   * @param {string} sessionId - Ad session ID
   * @param {Object} adData - Ad completion data
   * @returns {number} Credits awarded
   */
  async awardCredits(userId, sessionId, adData) {
    try {
      const creditsToAward = this.DEFAULT_CREDITS_PER_AD;

      // Add credits to user's account
      const credit = await Credit.findOne({ userId });
      if (!credit) {
        throw new Error('User credit record not found');
      }

      // Add credits to global balance
      credit.globalCredits.balance += creditsToAward;
      await credit.save();

      // Log the transaction
      await CreditTransaction.logAdReward(userId, {
        sessionId,
        adType: adData.adType,
        adUnitId: adData.adUnitId,
        watchDuration: adData.watchDuration,
        completionRate: adData.completionRate,
        source: adData.source,
        creditsAwarded: creditsToAward
      });

      return creditsToAward;

    } catch (error) {
      console.error('Error awarding credits:', error);
      throw new Error(`Failed to award credits: ${error.message}`);
    }
  }

  /**
   * Check if user is eligible to watch ads
   * @param {string} userId - User ID
   * @returns {Object} Eligibility status
   */
  async checkAdEligibility(userId) {
    try {
      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // For unlimited system, always eligible
      // You can add restrictions here if needed in the future
      const isEligible = true;
      const reason = 'User is eligible to watch reward ads';

      // Get user's ad stats for information
      const adStats = await this.getUserAdStats(userId);

      return {
        isEligible,
        reason,
        stats: adStats,
        creditsPerAd: this.DEFAULT_CREDITS_PER_AD
      };

    } catch (error) {
      console.error('Error checking ad eligibility:', error);
      return {
        isEligible: false,
        reason: `Error checking eligibility: ${error.message}`,
        stats: null,
        creditsPerAd: this.DEFAULT_CREDITS_PER_AD
      };
    }
  }

  /**
   * Get user's ad watching statistics
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Object} User ad statistics
   */
  async getUserAdStats(userId, days = 30) {
    try {
      const adStats = await AdReward.getUserStats(userId, days);
      const creditStats = await CreditTransaction.getAdRewardStats(userId, days);

      return {
        period: `${days} days`,
        ads: {
          totalWatched: adStats.totalAdsWatched,
          completed: adStats.completedAds,
          failed: adStats.failedAds,
          averageCompletionRate: Math.round(adStats.averageCompletionRate || 0),
          totalWatchTime: Math.round(adStats.totalWatchTime || 0)
        },
        credits: {
          totalEarned: creditStats.totalCreditsEarned,
          averagePerAd: Math.round(creditStats.averageCreditsPerAd || 0),
          averageDaily: creditStats.averageDaily
        },
        engagement: {
          totalWatchTimeMinutes: Math.round((adStats.totalWatchTime || 0) / 60),
          averageWatchTimePerAd: Math.round((adStats.totalWatchTime || 0) / Math.max(adStats.totalAdsWatched, 1))
        }
      };

    } catch (error) {
      console.error('Error getting user ad stats:', error);
      return {
        period: `${days} days`,
        ads: { totalWatched: 0, completed: 0, failed: 0, averageCompletionRate: 0, totalWatchTime: 0 },
        credits: { totalEarned: 0, averagePerAd: 0, averageDaily: 0 },
        engagement: { totalWatchTimeMinutes: 0, averageWatchTimePerAd: 0 }
      };
    }
  }

  /**
   * Get ad session details
   * @param {string} sessionId - Ad session ID
   * @returns {Object} Ad session details
   */
  async getAdSession(sessionId) {
    try {
      const adReward = await AdReward.findOne({ sessionId });
      if (!adReward) {
        throw new Error('Ad session not found');
      }

      return {
        sessionId: adReward.sessionId,
        status: adReward.status,
        adType: adReward.adType,
        startTime: adReward.watchStartTime,
        endTime: adReward.watchEndTime,
        duration: adReward.adDuration,
        watchDuration: adReward.watchDuration,
        completionRate: adReward.completionRate,
        creditsAwarded: adReward.creditsAwarded,
        rewardClaimed: adReward.rewardClaimed,
        source: adReward.source
      };

    } catch (error) {
      console.error('Error getting ad session:', error);
      throw new Error(`Failed to get ad session: ${error.message}`);
    }
  }

  /**
   * Get global ad statistics (admin)
   * @param {number} days - Number of days to look back
   * @returns {Object} Global ad statistics
   */
  async getGlobalAdStats(days = 30) {
    try {
      const globalStats = await AdReward.getGlobalStats(days);

      return {
        period: `${days} days`,
        overview: {
          totalUsers: globalStats.totalUsers,
          totalAdsWatched: globalStats.totalAdsWatched,
          totalCreditsAwarded: globalStats.totalCreditsAwarded,
          totalRevenue: globalStats.totalRevenue,
          averageCompletionRate: Math.round(globalStats.averageCompletionRate || 0)
        },
        performance: {
          completionRate: Math.round(globalStats.completionRate || 0),
          averageCreditsPerUser: globalStats.totalUsers > 0
            ? Math.round(globalStats.totalCreditsAwarded / globalStats.totalUsers)
            : 0,
          averageRevenuePerAd: globalStats.totalAdsWatched > 0
            ? (globalStats.totalRevenue / globalStats.totalAdsWatched).toFixed(4)
            : 0
        }
      };

    } catch (error) {
      console.error('Error getting global ad stats:', error);
      throw new Error(`Failed to get global ad stats: ${error.message}`);
    }
  }
}

module.exports = new AdRewardService();