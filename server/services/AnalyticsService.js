const AdReward = require('../models/AdReward');
const AdAnalytics = require('../models/AdAnalytics');
const CreditTransaction = require('../models/CreditTransaction');
const User = require('../models/User');
const cron = require('node-cron');

class AnalyticsService {
  constructor() {
    this.setupAnalyticsCronJobs();
  }

  /**
   * Setup automated analytics generation
   */
  setupAnalyticsCronJobs() {
    // Generate daily analytics at 1:00 AM
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('Generating daily ad analytics...');
        await this.generateDailyAnalytics();
        console.log('Daily ad analytics generated successfully');
      } catch (error) {
        console.error('Error generating daily analytics:', error);
      }
    });

    // Generate weekly analytics every Monday at 2:00 AM
    cron.schedule('0 2 * * 1', async () => {
      try {
        console.log('Generating weekly ad analytics...');
        await this.generateWeeklyAnalytics();
        console.log('Weekly ad analytics generated successfully');
      } catch (error) {
        console.error('Error generating weekly analytics:', error);
      }
    });

    // Generate monthly analytics on 1st of each month at 3:00 AM
    cron.schedule('0 3 1 * *', async () => {
      try {
        console.log('Generating monthly ad analytics...');
        await this.generateMonthlyAnalytics();
        console.log('Monthly ad analytics generated successfully');
      } catch (error) {
        console.error('Error generating monthly analytics:', error);
      }
    });
  }

  /**
   * Generate daily analytics for all users and global stats
   * @param {Date} date - Date to generate analytics for (default: yesterday)
   */
  async generateDailyAnalytics(date) {
    try {
      const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Generate global analytics
      await this.generateGlobalDailyAnalytics(targetDate, startOfDay, endOfDay);

      // Generate per-user analytics for active users
      await this.generateUserDailyAnalytics(targetDate, startOfDay, endOfDay);

      console.log(`Daily analytics generated for ${targetDate.toISOString().split('T')[0]}`);

    } catch (error) {
      console.error('Error in generateDailyAnalytics:', error);
      throw error;
    }
  }

  /**
   * Generate global daily analytics
   */
  async generateGlobalDailyAnalytics(targetDate, startOfDay, endOfDay) {
    try {
      const adRewards = await AdReward.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      if (adRewards.length === 0) {
        return; // No ad activity for this day
      }

      // Calculate metrics
      const metrics = this.calculateMetrics(adRewards);
      const creditMetrics = await this.calculateCreditMetrics(startOfDay, endOfDay);
      const userMetrics = await this.calculateUserMetrics(startOfDay, endOfDay);
      const sourceBreakdown = this.calculateSourceBreakdown(adRewards);
      const deviceBreakdown = this.calculateDeviceBreakdown(adRewards);
      const adTypeBreakdown = this.calculateAdTypeBreakdown(adRewards);
      const errorAnalysis = this.calculateErrorAnalysis(adRewards);
      const geographic = await this.calculateGeographicData(adRewards);
      const insights = this.generateInsights(metrics, sourceBreakdown);

      // Create or update analytics record
      await AdAnalytics.findOneAndUpdate(
        {
          date: targetDate,
          aggregationType: 'daily',
          userId: { $exists: false } // Global record
        },
        {
          date: targetDate,
          aggregationType: 'daily',
          metrics,
          creditMetrics,
          userMetrics,
          sourceBreakdown,
          deviceBreakdown,
          adTypeBreakdown,
          errorAnalysis,
          geographic,
          insights
        },
        { upsert: true, new: true }
      );

    } catch (error) {
      console.error('Error generating global daily analytics:', error);
      throw error;
    }
  }

  /**
   * Generate user-specific daily analytics
   */
  async generateUserDailyAnalytics(targetDate, startOfDay, endOfDay) {
    try {
      // Get all users who had ad activity on this day
      const activeUsers = await AdReward.distinct('userId', {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      for (const userId of activeUsers) {
        const userAdRewards = await AdReward.find({
          userId,
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const metrics = this.calculateMetrics(userAdRewards);
        const creditMetrics = await this.calculateCreditMetrics(startOfDay, endOfDay, userId);
        const sourceBreakdown = this.calculateSourceBreakdown(userAdRewards);
        const deviceBreakdown = this.calculateDeviceBreakdown(userAdRewards);

        await AdAnalytics.findOneAndUpdate(
          {
            date: targetDate,
            aggregationType: 'daily',
            userId
          },
          {
            date: targetDate,
            aggregationType: 'daily',
            userId,
            metrics,
            creditMetrics,
            userMetrics: {
              uniqueUsers: 1,
              averageSessionsPerUser: userAdRewards.length,
              averageAdsPerUser: userAdRewards.length
            },
            sourceBreakdown,
            deviceBreakdown
          },
          { upsert: true, new: true }
        );
      }

    } catch (error) {
      console.error('Error generating user daily analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate basic metrics from ad rewards
   */
  calculateMetrics(adRewards) {
    const total = adRewards.length;
    const completed = adRewards.filter(ad => ad.status === 'completed').length;
    const failed = adRewards.filter(ad => ad.status === 'failed').length;
    const skipped = adRewards.filter(ad => ad.adSkipped).length;
    const clicked = adRewards.filter(ad => ad.adClicked).length;

    const totalWatchTime = adRewards.reduce((sum, ad) => sum + (ad.watchDuration || 0), 0);
    const totalRevenue = adRewards.reduce((sum, ad) => sum + (ad.estimatedRevenue || 0), 0);

    return {
      totalAdsRequested: total,
      totalAdsLoaded: total, // Assuming all requested ads were loaded
      totalAdsShown: total,
      totalAdsCompleted: completed,
      totalAdsFailed: failed,
      totalAdsSkipped: skipped,
      loadSuccessRate: total > 0 ? 100 : 0, // Simplified for now
      showSuccessRate: total > 0 ? 100 : 0, // Simplified for now
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      skipRate: total > 0 ? (skipped / total) * 100 : 0,
      clickThroughRate: total > 0 ? (clicked / total) * 100 : 0,
      averageWatchTime: completed > 0 ? totalWatchTime / completed : 0,
      totalWatchTime,
      averageLoadTime: 2.5, // Simplified average
      totalRevenue,
      averageRPM: total > 0 ? (totalRevenue / total) * 1000 : 0,
      averageECPM: total > 0 ? (totalRevenue / total) * 1000 : 0
    };
  }

  /**
   * Calculate credit-related metrics
   */
  async calculateCreditMetrics(startOfDay, endOfDay, userId = null) {
    try {
      const query = {
        type: 'ad_reward',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      };

      if (userId) {
        query.userId = userId;
      }

      const creditTransactions = await CreditTransaction.find(query);

      const totalCreditsAwarded = creditTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const totalRewardsClaimed = creditTransactions.length;
      const averageCreditsPerAd = totalRewardsClaimed > 0 ? totalCreditsAwarded / totalRewardsClaimed : 0;

      return {
        totalCreditsAwarded,
        totalRewardsClaimed,
        averageCreditsPerAd,
        unclaimedRewards: 0 // For future implementation
      };

    } catch (error) {
      console.error('Error calculating credit metrics:', error);
      return {
        totalCreditsAwarded: 0,
        totalRewardsClaimed: 0,
        averageCreditsPerAd: 0,
        unclaimedRewards: 0
      };
    }
  }

  /**
   * Calculate user metrics
   */
  async calculateUserMetrics(startOfDay, endOfDay) {
    try {
      const uniqueUsers = await AdReward.distinct('userId', {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Get new users (users who watched their first ad today)
      const newUserIds = [];
      for (const userId of uniqueUsers) {
        const firstAdEver = await AdReward.findOne({ userId }).sort({ createdAt: 1 });
        if (firstAdEver && firstAdEver.createdAt >= startOfDay && firstAdEver.createdAt <= endOfDay) {
          newUserIds.push(userId);
        }
      }

      const totalSessions = await AdReward.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      return {
        uniqueUsers: uniqueUsers.length,
        newUsers: newUserIds.length,
        returningUsers: uniqueUsers.length - newUserIds.length,
        averageSessionsPerUser: uniqueUsers.length > 0 ? totalSessions / uniqueUsers.length : 0,
        averageAdsPerUser: uniqueUsers.length > 0 ? totalSessions / uniqueUsers.length : 0
      };

    } catch (error) {
      console.error('Error calculating user metrics:', error);
      return {
        uniqueUsers: 0,
        newUsers: 0,
        returningUsers: 0,
        averageSessionsPerUser: 0,
        averageAdsPerUser: 0
      };
    }
  }

  /**
   * Calculate source breakdown
   */
  calculateSourceBreakdown(adRewards) {
    const breakdown = {
      profile: 0,
      creditPurchase: 0,
      lowCreditWarning: 0,
      mainScreen: 0,
      aiGeneration: 0
    };

    adRewards.forEach(ad => {
      if (breakdown.hasOwnProperty(ad.source)) {
        breakdown[ad.source]++;
      }
    });

    return breakdown;
  }

  /**
   * Calculate device breakdown
   */
  calculateDeviceBreakdown(adRewards) {
    const breakdown = {
      ios: 0,
      android: 0,
      web: 0
    };

    adRewards.forEach(ad => {
      const platform = ad.deviceInfo?.platform || 'unknown';
      if (breakdown.hasOwnProperty(platform)) {
        breakdown[platform]++;
      }
    });

    return breakdown;
  }

  /**
   * Calculate ad type breakdown
   */
  calculateAdTypeBreakdown(adRewards) {
    const breakdown = {
      rewarded: 0,
      rewardedInterstitial: 0
    };

    adRewards.forEach(ad => {
      if (ad.adType === 'rewarded') {
        breakdown.rewarded++;
      } else if (ad.adType === 'rewarded_interstitial') {
        breakdown.rewardedInterstitial++;
      }
    });

    return breakdown;
  }

  /**
   * Calculate error analysis
   */
  calculateErrorAnalysis(adRewards) {
    const failedAds = adRewards.filter(ad => ad.error?.occurred);

    const errorCounts = {};
    failedAds.forEach(ad => {
      const errorCode = ad.error.errorCode || 'unknown';
      if (!errorCounts[errorCode]) {
        errorCounts[errorCode] = {
          code: errorCode,
          count: 0,
          message: ad.error.errorMessage || 'Unknown error'
        };
      }
      errorCounts[errorCode].count++;
    });

    const topErrorCodes = Object.values(errorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      loadErrors: failedAds.filter(ad => ad.error.errorCode?.includes('load')).length,
      showErrors: failedAds.filter(ad => ad.error.errorCode?.includes('show')).length,
      networkErrors: failedAds.filter(ad => ad.error.errorCode?.includes('network')).length,
      timeoutErrors: failedAds.filter(ad => ad.error.errorCode?.includes('timeout')).length,
      otherErrors: failedAds.length,
      topErrorCodes
    };
  }

  /**
   * Calculate geographic data
   */
  async calculateGeographicData(adRewards) {
    const countryStats = {};
    const regionStats = {};

    adRewards.forEach(ad => {
      // Country stats
      const country = ad.location?.country || 'Unknown';
      if (!countryStats[country]) {
        countryStats[country] = { country, count: 0, revenue: 0 };
      }
      countryStats[country].count++;
      countryStats[country].revenue += ad.estimatedRevenue || 0;

      // Region stats
      const region = ad.location?.region || 'Unknown';
      if (!regionStats[region]) {
        regionStats[region] = { region, count: 0, revenue: 0 };
      }
      regionStats[region].count++;
      regionStats[region].revenue += ad.estimatedRevenue || 0;
    });

    return {
      topCountries: Object.values(countryStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topRegions: Object.values(regionStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  /**
   * Generate insights and recommendations
   */
  generateInsights(metrics, sourceBreakdown) {
    const insights = {
      bestPerformingSource: '',
      worstPerformingSource: '',
      peakHour: 14, // Default assumption
      recommendedOptimizations: []
    };

    // Find best and worst performing sources
    const sourceEntries = Object.entries(sourceBreakdown);
    if (sourceEntries.length > 0) {
      sourceEntries.sort((a, b) => b[1] - a[1]);
      insights.bestPerformingSource = sourceEntries[0][0];
      insights.worstPerformingSource = sourceEntries[sourceEntries.length - 1][0];
    }

    // Generate recommendations based on metrics
    if (metrics.completionRate < 70) {
      insights.recommendedOptimizations.push('Improve ad quality to increase completion rate');
    }

    if (metrics.clickThroughRate < 2) {
      insights.recommendedOptimizations.push('Optimize ad targeting to improve click-through rate');
    }

    if (metrics.skipRate > 30) {
      insights.recommendedOptimizations.push('Review ad content relevance and reduce skip rate');
    }

    return insights;
  }

  /**
   * Generate weekly analytics
   */
  async generateWeeklyAnalytics() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Aggregate daily analytics into weekly summary
    const dailyAnalytics = await AdAnalytics.find({
      date: { $gte: startDate, $lte: endDate },
      aggregationType: 'daily',
      userId: { $exists: false }
    });

    if (dailyAnalytics.length === 0) return;

    const weeklyMetrics = this.aggregateMetrics(dailyAnalytics);

    await AdAnalytics.findOneAndUpdate(
      {
        date: endDate,
        aggregationType: 'weekly',
        userId: { $exists: false }
      },
      {
        date: endDate,
        aggregationType: 'weekly',
        metrics: weeklyMetrics,
        // Add other aggregated data as needed
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Generate monthly analytics
   */
  async generateMonthlyAnalytics() {
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Aggregate daily analytics into monthly summary
    const dailyAnalytics = await AdAnalytics.find({
      date: { $gte: startDate, $lte: endDate },
      aggregationType: 'daily',
      userId: { $exists: false }
    });

    if (dailyAnalytics.length === 0) return;

    const monthlyMetrics = this.aggregateMetrics(dailyAnalytics);

    await AdAnalytics.findOneAndUpdate(
      {
        date: endDate,
        aggregationType: 'monthly',
        userId: { $exists: false }
      },
      {
        date: endDate,
        aggregationType: 'monthly',
        metrics: monthlyMetrics,
        // Add other aggregated data as needed
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Aggregate metrics from multiple analytics records
   */
  aggregateMetrics(analyticsArray) {
    const totals = analyticsArray.reduce((acc, analytics) => {
      Object.keys(analytics.metrics.toObject()).forEach(key => {
        if (key.startsWith('total') || key.startsWith('average')) {
          acc[key] = (acc[key] || 0) + (analytics.metrics[key] || 0);
        }
      });
      return acc;
    }, {});

    // Calculate averages
    const count = analyticsArray.length;
    Object.keys(totals).forEach(key => {
      if (key.startsWith('average')) {
        totals[key] = count > 0 ? totals[key] / count : 0;
      }
    });

    return totals;
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(timeframe = 'daily', days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const analytics = await AdAnalytics.find({
        date: { $gte: startDate, $lte: endDate },
        aggregationType: timeframe,
        userId: { $exists: false }
      }).sort({ date: -1 });

      return {
        timeframe,
        period: `${days} days`,
        data: analytics,
        summary: analytics.length > 0 ? this.calculateSummary(analytics) : null
      };

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(analytics) {
    const latest = analytics[0];
    const previous = analytics[1];

    const summary = {
      current: latest ? {
        totalAds: latest.metrics.totalAdsCompleted,
        totalUsers: latest.userMetrics.uniqueUsers,
        totalCredits: latest.creditMetrics.totalCreditsAwarded,
        completionRate: latest.metrics.completionRate,
        revenue: latest.metrics.totalRevenue
      } : null,
      trends: {}
    };

    // Calculate trends
    if (latest && previous) {
      summary.trends = {
        adsChange: this.calculatePercentageChange(previous.metrics.totalAdsCompleted, latest.metrics.totalAdsCompleted),
        usersChange: this.calculatePercentageChange(previous.userMetrics.uniqueUsers, latest.userMetrics.uniqueUsers),
        creditsChange: this.calculatePercentageChange(previous.creditMetrics.totalCreditsAwarded, latest.creditMetrics.totalCreditsAwarded),
        revenueChange: this.calculatePercentageChange(previous.metrics.totalRevenue, latest.metrics.totalRevenue)
      };
    }

    return summary;
  }

  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }
}

module.exports = new AnalyticsService();