const mongoose = require('mongoose');

const adAnalyticsSchema = new mongoose.Schema({
  // Date for aggregation
  date: {
    type: Date,
    required: true,
    index: true
  },

  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Aggregation Level
  aggregationType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'global'],
    required: true,
    index: true
  },

  // Ad Performance Metrics
  metrics: {
    // Volume Metrics
    totalAdsRequested: {
      type: Number,
      default: 0
    },

    totalAdsLoaded: {
      type: Number,
      default: 0
    },

    totalAdsShown: {
      type: Number,
      default: 0
    },

    totalAdsCompleted: {
      type: Number,
      default: 0
    },

    totalAdsFailed: {
      type: Number,
      default: 0
    },

    totalAdsSkipped: {
      type: Number,
      default: 0
    },

    // Rate Metrics
    loadSuccessRate: {
      type: Number,
      default: 0
    },

    showSuccessRate: {
      type: Number,
      default: 0
    },

    completionRate: {
      type: Number,
      default: 0
    },

    skipRate: {
      type: Number,
      default: 0
    },

    clickThroughRate: {
      type: Number,
      default: 0
    },

    // Time Metrics
    averageWatchTime: {
      type: Number,
      default: 0
    },

    totalWatchTime: {
      type: Number,
      default: 0
    },

    averageLoadTime: {
      type: Number,
      default: 0
    },

    // Revenue Metrics
    totalRevenue: {
      type: Number,
      default: 0
    },

    averageRPM: {
      type: Number,
      default: 0 // Revenue per mille (thousand impressions)
    },

    averageECPM: {
      type: Number,
      default: 0 // Effective cost per mille
    }
  },

  // Credit Metrics
  creditMetrics: {
    totalCreditsAwarded: {
      type: Number,
      default: 0
    },

    totalRewardsClaimed: {
      type: Number,
      default: 0
    },

    averageCreditsPerAd: {
      type: Number,
      default: 5
    },

    unclaimedRewards: {
      type: Number,
      default: 0
    }
  },

  // User Engagement Metrics
  userMetrics: {
    uniqueUsers: {
      type: Number,
      default: 0
    },

    newUsers: {
      type: Number,
      default: 0
    },

    returningUsers: {
      type: Number,
      default: 0
    },

    averageSessionsPerUser: {
      type: Number,
      default: 0
    },

    averageAdsPerUser: {
      type: Number,
      default: 0
    }
  },

  // Source Breakdown
  sourceBreakdown: {
    profile: {
      type: Number,
      default: 0
    },

    creditPurchase: {
      type: Number,
      default: 0
    },

    lowCreditWarning: {
      type: Number,
      default: 0
    },

    mainScreen: {
      type: Number,
      default: 0
    },

    aiGeneration: {
      type: Number,
      default: 0
    }
  },

  // Device Breakdown
  deviceBreakdown: {
    ios: {
      type: Number,
      default: 0
    },

    android: {
      type: Number,
      default: 0
    },

    web: {
      type: Number,
      default: 0
    }
  },

  // Ad Type Breakdown
  adTypeBreakdown: {
    rewarded: {
      type: Number,
      default: 0
    },

    rewardedInterstitial: {
      type: Number,
      default: 0
    }
  },

  // Error Analysis
  errorAnalysis: {
    loadErrors: {
      type: Number,
      default: 0
    },

    showErrors: {
      type: Number,
      default: 0
    },

    networkErrors: {
      type: Number,
      default: 0
    },

    timeoutErrors: {
      type: Number,
      default: 0
    },

    otherErrors: {
      type: Number,
      default: 0
    },

    topErrorCodes: [{
      code: String,
      count: Number,
      message: String
    }]
  },

  // Geographic Data
  geographic: {
    topCountries: [{
      country: String,
      count: Number,
      revenue: Number
    }],

    topRegions: [{
      region: String,
      count: Number,
      revenue: Number
    }]
  },

  // Performance Insights
  insights: {
    bestPerformingSource: String,
    worstPerformingSource: String,
    peakHour: Number,
    recommendedOptimizations: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
adAnalyticsSchema.index({ date: 1, aggregationType: 1 });
adAnalyticsSchema.index({ userId: 1, date: 1, aggregationType: 1 });
adAnalyticsSchema.index({ aggregationType: 1, date: -1 });

// Virtual for ROI calculation
adAnalyticsSchema.virtual('roi').get(function() {
  const creditCost = this.creditMetrics.totalCreditsAwarded * 0.01; // Assuming 1 credit = ₹0.01
  return this.metrics.totalRevenue > 0 ? (this.metrics.totalRevenue - creditCost) / creditCost : 0;
});

// Static methods for analytics
adAnalyticsSchema.statics.generateDailyReport = async function(date = new Date()) {
  const AdReward = mongoose.model('AdReward');

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const stats = await AdReward.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalAdsRequested: { $sum: 1 },
        totalAdsCompleted: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalAdsFailed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalCreditsAwarded: { $sum: '$creditsAwarded' },
        totalRevenue: { $sum: '$estimatedRevenue' },
        totalWatchTime: { $sum: '$watchDuration' },
        uniqueUsers: { $addToSet: '$userId' },
        sourceBreakdown: {
          $push: '$source'
        },
        deviceBreakdown: {
          $push: '$deviceInfo.platform'
        }
      }
    }
  ]);

  return stats[0] || {};
};

adAnalyticsSchema.statics.getTopPerformers = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        date: { $gte: startDate },
        aggregationType: 'daily',
        userId: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalAds: { $sum: '$metrics.totalAdsCompleted' },
        totalCredits: { $sum: '$creditMetrics.totalCreditsAwarded' },
        avgCompletionRate: { $avg: '$metrics.completionRate' }
      }
    },
    {
      $sort: { totalAds: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    }
  ]);
};

adAnalyticsSchema.statics.getTrends = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        date: { $gte: startDate },
        aggregationType: 'daily',
        userId: { $exists: false } // Global stats only
      }
    },
    {
      $sort: { date: 1 }
    },
    {
      $project: {
        date: 1,
        totalAds: '$metrics.totalAdsCompleted',
        completionRate: '$metrics.completionRate',
        revenue: '$metrics.totalRevenue',
        credits: '$creditMetrics.totalCreditsAwarded',
        users: '$userMetrics.uniqueUsers'
      }
    }
  ]);
};

// Instance methods
adAnalyticsSchema.methods.calculateMetrics = function(adRewards) {
  const total = adRewards.length;
  const completed = adRewards.filter(ad => ad.status === 'completed').length;
  const failed = adRewards.filter(ad => ad.status === 'failed').length;
  const skipped = adRewards.filter(ad => ad.adSkipped).length;

  this.metrics.totalAdsRequested = total;
  this.metrics.totalAdsCompleted = completed;
  this.metrics.totalAdsFailed = failed;
  this.metrics.totalAdsSkipped = skipped;
  this.metrics.completionRate = total > 0 ? (completed / total) * 100 : 0;
  this.metrics.skipRate = total > 0 ? (skipped / total) * 100 : 0;

  // Calculate other metrics
  this.metrics.totalWatchTime = adRewards.reduce((sum, ad) => sum + (ad.watchDuration || 0), 0);
  this.metrics.averageWatchTime = completed > 0 ? this.metrics.totalWatchTime / completed : 0;
  this.metrics.totalRevenue = adRewards.reduce((sum, ad) => sum + (ad.estimatedRevenue || 0), 0);

  this.creditMetrics.totalCreditsAwarded = adRewards.reduce((sum, ad) => sum + (ad.creditsAwarded || 0), 0);
  this.creditMetrics.totalRewardsClaimed = adRewards.filter(ad => ad.rewardClaimed).length;

  return this;
};

module.exports = mongoose.model('AdAnalytics', adAnalyticsSchema);