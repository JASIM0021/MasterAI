const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['purchase', 'deduction', 'refund', 'bonus', 'adjustment', 'ad_reward'],
    required: true
  },

  // For purchases - reference to payment order
  paymentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentOrder',
    default: null
  },

  // Service that consumed credits (for deductions)
  service: {
    type: String,
    enum: ['postGeneration', 'captionGeneration', 'aiImageEdit', 'aiImageGeneration',
           'automation', 'execution', 'videoGeneration'],
    default: null
  },

  // Credit amount (positive for additions, negative for deductions)
  amount: {
    type: Number,
    required: true
  },

  // Balance before this transaction
  balanceBefore: {
    type: Number,
    required: true,
    min: 0
  },

  // Balance after this transaction
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },

  // Description of the transaction
  description: {
    type: String,
    required: true,
    trim: true
  },

  // Additional metadata
  metadata: {
    // For service deductions - cost per unit
    creditCost: {
      type: Number,
      default: null
    },

    // For purchases - package details
    packageDetails: {
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreditPackage',
        default: null
      },
      packageName: String,
      bonusCredits: {
        type: Number,
        default: 0
      }
    },

    // For refunds - original transaction reference
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditTransaction',
      default: null
    },

    // Additional context
    source: {
      type: String,
      default: 'system'
    },

    // For ad rewards - ad session details
    adRewardDetails: {
      adSessionId: {
        type: String,
        default: null
      },
      adType: {
        type: String,
        enum: ['rewarded', 'rewarded_interstitial'],
        default: null
      },
      adUnitId: String,
      watchDuration: Number,
      completionRate: Number,
      adSource: {
        type: String,
        enum: ['profile', 'credit_purchase', 'low_credit_warning', 'main_screen', 'ai_generation'],
        default: null
      }
    },

    notes: String
  },

  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
creditTransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to log a credit transaction
creditTransactionSchema.statics.logTransaction = async function(transactionData) {
  const { userId, type, amount, service, description, metadata = {} } = transactionData;

  // Get current credit balance (from Credit model)
  // Use lazy loading to avoid circular dependency
  let balanceBefore = 0;
  let balanceAfter = amount;

  try {
    const Credit = require('./Credit');
    const userCredits = await Credit.findOne({ userId });
    if (userCredits && userCredits.globalCredits) {
      balanceBefore = userCredits.globalCredits.balance || 0;
      balanceAfter = balanceBefore + amount;
    }
  } catch (creditError) {
    console.warn('Failed to get credit balance for transaction log:', creditError.message);
    // Continue with default values
  }

  const transaction = new this({
    userId,
    type,
    amount,
    service,
    description,
    balanceBefore,
    balanceAfter,
    metadata,
    status: 'completed'
  });

  return transaction.save();
};

// Static method to get user transaction history
creditTransactionSchema.statics.getUserTransactions = async function(userId, options = {}) {
  const { page = 1, limit = 20, type = null, service = null } = options;

  const query = { userId };
  if (type) query.type = type;
  if (service) query.service = service;

  const transactions = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('paymentOrderId', 'orderId amount status')
    .populate('metadata.packageDetails.packageId', 'name credits price');

  const totalTransactions = await this.countDocuments(query);

  return {
    transactions,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalTransactions / limit),
      totalTransactions,
      hasNext: page * limit < totalTransactions,
      hasPrev: page > 1
    }
  };
};

// Static method to log ad reward transaction
creditTransactionSchema.statics.logAdReward = async function(userId, adRewardData) {
  const { sessionId, adType, adUnitId, watchDuration, completionRate, source, creditsAwarded = 5 } = adRewardData;

  const description = `Earned ${creditsAwarded} credits for watching ${adType} ad`;

  const adRewardTransaction = {
    userId,
    type: 'ad_reward',
    amount: creditsAwarded,
    description,
    metadata: {
      source: 'ad_reward',
      adRewardDetails: {
        adSessionId: sessionId,
        adType,
        adUnitId,
        watchDuration,
        completionRate,
        adSource: source
      }
    }
  };

  return this.logTransaction(adRewardTransaction);
};

// Static method to get ad reward statistics
creditTransactionSchema.statics.getAdRewardStats = async function(userId, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'ad_reward',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$metadata.adRewardDetails.adSource',
        totalCreditsEarned: { $sum: '$amount' },
        totalAdsWatched: { $sum: 1 },
        averageWatchTime: { $avg: '$metadata.adRewardDetails.watchDuration' },
        averageCompletionRate: { $avg: '$metadata.adRewardDetails.completionRate' }
      }
    },
    {
      $sort: { totalCreditsEarned: -1 }
    }
  ]);

  const totalCreditsEarned = stats.reduce((sum, stat) => sum + stat.totalCreditsEarned, 0);
  const totalAdsWatched = stats.reduce((sum, stat) => sum + stat.totalAdsWatched, 0);

  return {
    timeframe,
    totalCreditsEarned,
    totalAdsWatched,
    averageCreditsPerAd: totalAdsWatched > 0 ? totalCreditsEarned / totalAdsWatched : 0,
    sourceBreakdown: stats,
    averageDaily: Math.round(totalCreditsEarned / timeframe)
  };
};

// Static method to get credit usage statistics
creditTransactionSchema.statics.getCreditUsageStats = async function(userId, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'deduction',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$service',
        totalCreditsUsed: { $sum: { $abs: '$amount' } },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalCreditsUsed: -1 }
    }
  ]);

  const totalCreditsUsed = stats.reduce((sum, stat) => sum + stat.totalCreditsUsed, 0);

  return {
    timeframe,
    totalCreditsUsed,
    serviceBreakdown: stats,
    averageDaily: Math.round(totalCreditsUsed / timeframe)
  };
};

// Indexes for better query performance
creditTransactionSchema.index({ userId: 1, createdAt: -1 });
creditTransactionSchema.index({ userId: 1, type: 1 });
creditTransactionSchema.index({ userId: 1, service: 1 });
creditTransactionSchema.index({ paymentOrderId: 1 });
creditTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);