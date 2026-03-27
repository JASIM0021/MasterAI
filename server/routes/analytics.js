const express = require('express');
const analyticsService = require('../services/AnalyticsService');
const AdAnalytics = require('../models/AdAnalytics');
const AdReward = require('../models/AdReward');
const CreditTransaction = require('../models/CreditTransaction');
const { verifyToken } = require('./auth');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.subscription?.plan !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// =================== ANALYTICS DASHBOARD ENDPOINTS ===================

// GET ANALYTICS DASHBOARD DATA
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { timeframe = 'daily', days = 30 } = req.query;

    // Validate timeframe
    const validTimeframes = ['daily', 'weekly', 'monthly'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
      });
    }

    const dashboardData = await analyticsService.getDashboardData(timeframe, parseInt(days));

    res.json({
      success: true,
      dashboard: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// GET REAL-TIME ANALYTICS OVERVIEW
router.get('/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - parseInt(hours) * 60 * 60 * 1000);

    // Get recent ad activity
    const recentAds = await AdReward.find({
      createdAt: { $gte: startTime, $lte: endTime }
    });

    // Get recent credit transactions
    const recentCredits = await CreditTransaction.find({
      type: 'ad_reward',
      createdAt: { $gte: startTime, $lte: endTime }
    });

    // Calculate metrics
    const overview = {
      timeWindow: `${hours} hours`,
      totalAdsSessions: recentAds.length,
      completedAds: recentAds.filter(ad => ad.status === 'completed').length,
      failedAds: recentAds.filter(ad => ad.status === 'failed').length,
      totalCreditsAwarded: recentCredits.reduce((sum, tx) => sum + tx.amount, 0),
      uniqueUsers: new Set(recentAds.map(ad => ad.userId.toString())).size,
      averageCompletionRate: recentAds.length > 0
        ? recentAds.reduce((sum, ad) => sum + (ad.completionRate || 0), 0) / recentAds.length
        : 0,
      totalRevenue: recentAds.reduce((sum, ad) => sum + (ad.estimatedRevenue || 0), 0),

      // Source breakdown
      sourceBreakdown: recentAds.reduce((acc, ad) => {
        acc[ad.source] = (acc[ad.source] || 0) + 1;
        return acc;
      }, {}),

      // Status breakdown
      statusBreakdown: recentAds.reduce((acc, ad) => {
        acc[ad.status] = (acc[ad.status] || 0) + 1;
        return acc;
      }, {}),

      // Recent activity timeline (hourly breakdown)
      timeline: await this.generateHourlyTimeline(startTime, endTime, recentAds)
    };

    res.json({
      success: true,
      overview
    });

  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
});

// GENERATE ANALYTICS REPORT
router.post('/generate-report', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      reportType = 'comprehensive',
      startDate,
      endDate,
      aggregationType = 'daily',
      includeUserDetails = false
    } = req.body;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before endDate'
      });
    }

    // Generate report based on type
    let report = {};

    switch (reportType) {
      case 'comprehensive':
        report = await this.generateComprehensiveReport(start, end, aggregationType, includeUserDetails);
        break;
      case 'performance':
        report = await this.generatePerformanceReport(start, end);
        break;
      case 'revenue':
        report = await this.generateRevenueReport(start, end);
        break;
      case 'user_engagement':
        report = await this.generateUserEngagementReport(start, end);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid reportType. Must be: comprehensive, performance, revenue, or user_engagement'
        });
    }

    res.json({
      success: true,
      report: {
        ...report,
        generatedAt: new Date().toISOString(),
        reportType,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics report'
    });
  }
});

// GET USER PERFORMANCE LEADERBOARD
router.get('/leaderboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      metric = 'totalAds',
      days = 30,
      limit = 50,
      sortOrder = 'desc'
    } = req.query;

    const validMetrics = ['totalAds', 'totalCredits', 'completionRate', 'watchTime'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get leaderboard data
    const leaderboard = await this.generateLeaderboard(metric, startDate, parseInt(limit), sortOrder);

    res.json({
      success: true,
      leaderboard: {
        metric,
        period: `${days} days`,
        data: leaderboard
      }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});

// GET ANALYTICS TRENDS
router.get('/trends', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30, metrics = 'all' } = req.query;

    const trends = await AdAnalytics.getTrends(parseInt(days));

    // Calculate growth rates and trends
    const trendsWithGrowth = trends.map((item, index) => {
      if (index === 0) return { ...item, growth: {} };

      const previous = trends[index - 1];
      const growth = {
        totalAds: this.calculateGrowthRate(previous.totalAds, item.totalAds),
        completionRate: this.calculateGrowthRate(previous.completionRate, item.completionRate),
        revenue: this.calculateGrowthRate(previous.revenue, item.revenue),
        credits: this.calculateGrowthRate(previous.credits, item.credits),
        users: this.calculateGrowthRate(previous.users, item.users)
      };

      return { ...item, growth };
    });

    res.json({
      success: true,
      trends: {
        period: `${days} days`,
        data: trendsWithGrowth,
        summary: this.calculateTrendsSummary(trendsWithGrowth)
      }
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics trends'
    });
  }
});

// TRIGGER MANUAL ANALYTICS GENERATION
router.post('/generate/:type', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { date } = req.body;

    const validTypes = ['daily', 'weekly', 'monthly'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    let result;
    const targetDate = date ? new Date(date) : new Date();

    switch (type) {
      case 'daily':
        result = await analyticsService.generateDailyAnalytics(targetDate);
        break;
      case 'weekly':
        result = await analyticsService.generateWeeklyAnalytics();
        break;
      case 'monthly':
        result = await analyticsService.generateMonthlyAnalytics();
        break;
    }

    res.json({
      success: true,
      message: `${type} analytics generated successfully`,
      generatedFor: targetDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Manual analytics generation error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to generate ${req.params.type} analytics`
    });
  }
});

// GET ERROR ANALYSIS
router.get('/errors', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const errorAnalysis = await AdReward.aggregate([
      {
        $match: {
          'error.occurred': true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$error.errorCode',
          count: { $sum: 1 },
          message: { $first: '$error.errorMessage' },
          lastOccurred: { $max: '$error.errorTime' },
          affectedUsers: { $addToSet: '$userId' },
          sources: { $push: '$source' }
        }
      },
      {
        $project: {
          errorCode: '$_id',
          count: 1,
          message: 1,
          lastOccurred: 1,
          affectedUsersCount: { $size: '$affectedUsers' },
          sourceBreakdown: {
            $reduce: {
              input: '$sources',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [[{
                      k: '$$this',
                      v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                    }]]
                  }
                ]
              }
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      errorAnalysis: {
        period: `${days} days`,
        totalErrors: errorAnalysis.reduce((sum, error) => sum + error.count, 0),
        uniqueErrorCodes: errorAnalysis.length,
        errors: errorAnalysis
      }
    });

  } catch (error) {
    console.error('Get error analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error analysis'
    });
  }
});

// EXPORT ANALYTICS DATA
router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      format = 'json',
      startDate,
      endDate,
      dataType = 'all'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let exportData = {};

    // Collect data based on dataType
    if (dataType === 'all' || dataType === 'analytics') {
      exportData.analytics = await AdAnalytics.find({
        date: { $gte: start, $lte: end }
      }).sort({ date: -1 });
    }

    if (dataType === 'all' || dataType === 'rewards') {
      exportData.adRewards = await AdReward.find({
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: -1 });
    }

    if (dataType === 'all' || dataType === 'transactions') {
      exportData.creditTransactions = await CreditTransaction.find({
        type: 'ad_reward',
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: -1 });
    }

    // Handle different export formats
    if (format === 'csv') {
      // Convert to CSV format (simplified for this example)
      const csv = this.convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        exportData: {
          ...exportData,
          exportedAt: new Date().toISOString(),
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Export analytics data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

// =================== HELPER METHODS ===================

// Generate hourly timeline
router.generateHourlyTimeline = async function(startTime, endTime, ads) {
  const timeline = [];
  const hourMs = 60 * 60 * 1000;

  for (let time = startTime; time < endTime; time = new Date(time.getTime() + hourMs)) {
    const nextHour = new Date(time.getTime() + hourMs);
    const hourAds = ads.filter(ad =>
      ad.createdAt >= time && ad.createdAt < nextHour
    );

    timeline.push({
      hour: time.toISOString(),
      totalAds: hourAds.length,
      completedAds: hourAds.filter(ad => ad.status === 'completed').length,
      creditsAwarded: hourAds.reduce((sum, ad) => sum + (ad.creditsAwarded || 0), 0)
    });
  }

  return timeline;
};

// Calculate growth rate
router.calculateGrowthRate = function(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

// Calculate trends summary
router.calculateTrendsSummary = function(trends) {
  if (trends.length < 2) return null;

  const latest = trends[trends.length - 1];
  const earliest = trends[0];

  return {
    overallGrowth: {
      totalAds: this.calculateGrowthRate(earliest.totalAds, latest.totalAds),
      revenue: this.calculateGrowthRate(earliest.revenue, latest.revenue),
      users: this.calculateGrowthRate(earliest.users, latest.users)
    },
    averageDaily: {
      ads: trends.reduce((sum, t) => sum + t.totalAds, 0) / trends.length,
      revenue: trends.reduce((sum, t) => sum + t.revenue, 0) / trends.length,
      users: trends.reduce((sum, t) => sum + t.users, 0) / trends.length
    }
  };
};

// Convert data to CSV format (simplified)
router.convertToCSV = function(data) {
  // This is a simplified CSV conversion
  // In production, you'd want a more robust CSV library
  let csv = '';

  if (data.analytics) {
    csv += 'Date,Total Ads,Completed Ads,Credits Awarded,Revenue\n';
    data.analytics.forEach(item => {
      csv += `${item.date},${item.metrics.totalAdsCompleted},${item.metrics.totalAdsCompleted},${item.creditMetrics.totalCreditsAwarded},${item.metrics.totalRevenue}\n`;
    });
  }

  return csv;
};

module.exports = router;