const mongoose = require('mongoose');

const postHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },

  // Platform information
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'linkedin', 'twitter'],
    required: true
  },

  accountId: {
    type: String,
    required: true
  },

  accountName: {
    type: String,
    required: true
  },

  // Post details at time of publishing
  contentSnapshot: {
    text: {
      type: String,
      required: true
    },
    hashtags: [String],
    mentions: [String],
    mediaCount: {
      type: Number,
      default: 0
    }
  },

  // Platform-specific post information
  platformPostId: {
    type: String,
    required: true
  },

  platformPostUrl: {
    type: String,
    default: null
  },

  // Publishing details
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },

  publishingMethod: {
    type: String,
    enum: ['immediate', 'scheduled', 'automated'],
    required: true
  },

  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    default: null
  },

  // Publishing status
  status: {
    type: String,
    enum: ['published', 'deleted', 'hidden', 'failed'],
    default: 'published'
  },

  // Engagement metrics
  metrics: {
    // Current metrics
    current: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      saves: { type: Number, default: 0 }, // For Instagram
      retweets: { type: Number, default: 0 }, // For Twitter
      replies: { type: Number, default: 0 }, // For Twitter
      lastUpdated: { type: Date, default: Date.now }
    },

    // Historical snapshots for tracking growth
    history: [{
      timestamp: { type: Date, required: true },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      retweets: { type: Number, default: 0 },
      replies: { type: Number, default: 0 }
    }],

    // Performance indicators
    engagementRate: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    peakEngagementTime: { type: Date, default: null }
  },

  // Audience insights (if available from platform)
  audience: {
    demographics: {
      ageGroups: {
        '18-24': { type: Number, default: 0 },
        '25-34': { type: Number, default: 0 },
        '35-44': { type: Number, default: 0 },
        '45-54': { type: Number, default: 0 },
        '55-64': { type: Number, default: 0 },
        '65+': { type: Number, default: 0 }
      },
      gender: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
      },
      topCountries: [{
        country: String,
        percentage: Number
      }],
      topCities: [{
        city: String,
        percentage: Number
      }]
    },
    behavior: {
      peakHours: [Number], // Hours when audience is most active
      peakDays: [Number],  // Days when audience is most active
      deviceTypes: {
        mobile: { type: Number, default: 0 },
        desktop: { type: Number, default: 0 },
        tablet: { type: Number, default: 0 }
      }
    }
  },

  // Content performance analysis
  performance: {
    category: {
      type: String,
      enum: ['technology', 'business', 'lifestyle', 'education', 'entertainment', 'news', 'personal', 'promotional', 'other'],
      default: 'other'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    topicTags: [String],
    performanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    benchmarkComparison: {
      vsUserAverage: { type: Number, default: 0 }, // Percentage difference
      vsPlatformAverage: { type: Number, default: 0 }, // If available
      vsCategoryAverage: { type: Number, default: 0 }
    }
  },

  // Cost tracking (for promoted posts)
  advertising: {
    isPromoted: { type: Boolean, default: false },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    costPerClick: { type: Number, default: 0 },
    costPerThousandImpressions: { type: Number, default: 0 },
    returnOnAdSpend: { type: Number, default: 0 }
  },

  // Error tracking
  errors: [{
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['fetch_error', 'api_error', 'rate_limit', 'permission_error', 'other']
    },
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],

  // Data freshness
  lastMetricsUpdate: {
    type: Date,
    default: Date.now
  },

  metricsUpdateFrequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'daily'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
postHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update metrics
postHistorySchema.methods.updateMetrics = function(newMetrics) {
  // Store current metrics in history before updating
  if (this.metrics.current.lastUpdated) {
    this.metrics.history.push({
      timestamp: this.metrics.current.lastUpdated,
      ...this.metrics.current.toObject()
    });

    // Keep only last 100 historical records to prevent unlimited growth
    if (this.metrics.history.length > 100) {
      this.metrics.history = this.metrics.history.slice(-100);
    }
  }

  // Update current metrics
  Object.assign(this.metrics.current, newMetrics);
  this.metrics.current.lastUpdated = new Date();
  this.lastMetricsUpdate = new Date();

  // Calculate engagement rate
  this.calculateEngagementRate();

  return this.save();
};

// Method to calculate engagement rate
postHistorySchema.methods.calculateEngagementRate = function() {
  const current = this.metrics.current;
  const totalEngagements = (current.likes || 0) + (current.shares || 0) + (current.comments || 0);
  const totalReach = current.reach || current.impressions || 1; // Avoid division by zero

  this.metrics.engagementRate = (totalEngagements / totalReach) * 100;

  // Calculate click-through rate if clicks and impressions are available
  if (current.clicks && current.impressions) {
    this.metrics.clickThroughRate = (current.clicks / current.impressions) * 100;
  }
};

// Method to calculate performance score
postHistorySchema.methods.calculatePerformanceScore = function(userAverages = {}) {
  const current = this.metrics.current;
  const weights = {
    likes: 0.3,
    shares: 0.3,
    comments: 0.25,
    clicks: 0.15
  };

  let score = 0;
  let totalWeight = 0;

  Object.keys(weights).forEach(metric => {
    if (current[metric] !== undefined && userAverages[metric]) {
      const ratio = current[metric] / userAverages[metric];
      score += weights[metric] * Math.min(ratio * 50, 100); // Cap individual metric contribution
      totalWeight += weights[metric];
    }
  });

  this.performance.performanceScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  return this.save();
};

// Method to add error
postHistorySchema.methods.addError = function(type, message, details = null) {
  this.errors.push({
    type,
    message,
    details,
    timestamp: new Date()
  });

  // Keep only last 10 errors to prevent unlimited growth
  if (this.errors.length > 10) {
    this.errors = this.errors.slice(-10);
  }

  return this.save();
};

// Static method to get user's post analytics
postHistorySchema.statics.getUserAnalytics = function(userId, dateRange = {}) {
  const match = { userId };

  if (dateRange.start && dateRange.end) {
    match.publishedAt = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$platform',
        totalPosts: { $sum: 1 },
        totalLikes: { $sum: '$metrics.current.likes' },
        totalShares: { $sum: '$metrics.current.shares' },
        totalComments: { $sum: '$metrics.current.comments' },
        totalViews: { $sum: '$metrics.current.views' },
        totalClicks: { $sum: '$metrics.current.clicks' },
        avgEngagementRate: { $avg: '$metrics.engagementRate' },
        avgPerformanceScore: { $avg: '$performance.performanceScore' }
      }
    }
  ]);
};

// Static method to get trending content
postHistorySchema.statics.getTrendingContent = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ 'performance.performanceScore': -1, 'metrics.current.lastUpdated': -1 })
    .limit(limit)
    .populate('postId');
};

// Static method to find posts needing metrics update
postHistorySchema.statics.findNeedingMetricsUpdate = function() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return this.find({
    status: 'published',
    lastMetricsUpdate: { $lt: oneDayAgo }
  });
};

// Indexes for better query performance
postHistorySchema.index({ userId: 1, publishedAt: -1 });
postHistorySchema.index({ userId: 1, platform: 1, publishedAt: -1 });
postHistorySchema.index({ postId: 1 });
postHistorySchema.index({ platformPostId: 1, platform: 1 });
postHistorySchema.index({ lastMetricsUpdate: 1, status: 1 });
postHistorySchema.index({ 'performance.performanceScore': -1 });
postHistorySchema.index({ scheduleId: 1 });

module.exports = mongoose.models.PostHistory || mongoose.model('PostHistory', postHistorySchema);