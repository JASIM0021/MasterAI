const mongoose = require('mongoose');

const adRewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Ad Session Details
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  adType: {
    type: String,
    enum: ['rewarded', 'rewarded_interstitial'],
    required: true
  },

  adUnitId: {
    type: String,
    required: true
  },

  adNetwork: {
    type: String,
    default: 'AdMob'
  },

  // Timing Information
  watchStartTime: {
    type: Date,
    required: true
  },

  watchEndTime: {
    type: Date
  },

  adDuration: {
    type: Number, // in seconds
    default: 0
  },

  watchDuration: {
    type: Number, // actual watched duration in seconds
    default: 0
  },

  completionRate: {
    type: Number, // percentage (0-100)
    default: 0
  },

  // Reward Information
  creditsAwarded: {
    type: Number,
    default: 5
  },

  rewardClaimed: {
    type: Boolean,
    default: false
  },

  rewardClaimedAt: {
    type: Date
  },

  // User Interaction
  adClicked: {
    type: Boolean,
    default: false
  },

  adSkipped: {
    type: Boolean,
    default: false
  },

  skipTime: {
    type: Number, // seconds when user skipped
    default: 0
  },

  // Technical Details
  deviceInfo: {
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    deviceModel: String,
    osVersion: String,
    appVersion: String,
    connectionType: {
      type: String,
      enum: ['wifi', 'cellular', 'unknown']
    }
  },

  // Geographic Information
  location: {
    country: String,
    region: String,
    city: String
  },

  // Error Handling
  error: {
    occurred: {
      type: Boolean,
      default: false
    },
    errorCode: String,
    errorMessage: String,
    errorTime: Date
  },

  // Analytics Metadata
  source: {
    type: String,
    enum: ['profile', 'credit_purchase', 'low_credit_warning', 'main_screen', 'ai_generation'],
    required: true
  },

  campaignId: String,

  // Revenue Information (for analytics)
  estimatedRevenue: {
    type: Number,
    default: 0
  },

  currency: {
    type: String,
    default: 'USD'
  },

  // Status
  status: {
    type: String,
    enum: ['initiated', 'loading', 'playing', 'completed', 'failed', 'abandoned'],
    default: 'initiated'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
adRewardSchema.index({ userId: 1, createdAt: -1 });
adRewardSchema.index({ status: 1, createdAt: -1 });
adRewardSchema.index({ rewardClaimed: 1, createdAt: -1 });
adRewardSchema.index({ source: 1, createdAt: -1 });

// Virtual for completion percentage
adRewardSchema.virtual('isCompleted').get(function() {
  return this.completionRate >= 100 && this.status === 'completed';
});

// Virtual for watch time in minutes
adRewardSchema.virtual('watchTimeMinutes').get(function() {
  return Math.round(this.watchDuration / 60 * 100) / 100;
});

// Static methods for analytics
adRewardSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAdsWatched: { $sum: 1 },
        totalCreditsEarned: { $sum: '$creditsAwarded' },
        averageCompletionRate: { $avg: '$completionRate' },
        totalWatchTime: { $sum: '$watchDuration' },
        completedAds: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        failedAds: {
          $sum: {
            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalAdsWatched: 0,
    totalCreditsEarned: 0,
    averageCompletionRate: 0,
    totalWatchTime: 0,
    completedAds: 0,
    failedAds: 0
  };
};

adRewardSchema.statics.getGlobalStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $addToSet: '$userId' },
        totalAdsWatched: { $sum: 1 },
        totalCreditsAwarded: { $sum: '$creditsAwarded' },
        averageCompletionRate: { $avg: '$completionRate' },
        totalRevenue: { $sum: '$estimatedRevenue' },
        completedAds: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        totalUsers: { $size: '$totalUsers' },
        totalAdsWatched: 1,
        totalCreditsAwarded: 1,
        averageCompletionRate: 1,
        totalRevenue: 1,
        completedAds: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedAds', '$totalAdsWatched'] },
            100
          ]
        }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    totalAdsWatched: 0,
    totalCreditsAwarded: 0,
    averageCompletionRate: 0,
    totalRevenue: 0,
    completedAds: 0,
    completionRate: 0
  };
};

// Instance methods
adRewardSchema.methods.markCompleted = function(watchDuration) {
  this.status = 'completed';
  this.watchEndTime = new Date();
  this.watchDuration = watchDuration;
  this.completionRate = this.adDuration > 0 ? (watchDuration / this.adDuration) * 100 : 100;
  return this.save();
};

adRewardSchema.methods.markFailed = function(errorCode, errorMessage) {
  this.status = 'failed';
  this.error.occurred = true;
  this.error.errorCode = errorCode;
  this.error.errorMessage = errorMessage;
  this.error.errorTime = new Date();
  return this.save();
};

adRewardSchema.methods.claimReward = function() {
  if (this.status === 'completed' && !this.rewardClaimed) {
    this.rewardClaimed = true;
    this.rewardClaimedAt = new Date();
    return this.save();
  }
  throw new Error('Reward cannot be claimed');
};

module.exports = mongoose.model('AdReward', adRewardSchema);