const mongoose = require('mongoose');

const cronJobSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Schedule identification
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true,
    index: true
  },

  // Cron expression for the job
  cronExpression: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Basic cron validation - you might want to use a more robust validator
        const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
        return cronRegex.test(v);
      },
      message: 'Invalid cron expression format'
    }
  },

  // Timezone for execution
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Job status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Execution tracking
  lastRun: {
    type: Date,
    default: null
  },

  nextRun: {
    type: Date,
    default: null
  },

  // Statistics
  stats: {
    totalExecutions: {
      type: Number,
      default: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0
    },
    failedExecutions: {
      type: Number,
      default: 0
    },
    averageExecutionTime: {
      type: Number,
      default: 0 // in milliseconds
    }
  },

  // Error tracking
  lastError: {
    type: String,
    default: null
  },

  errorCount: {
    type: Number,
    default: 0
  },

  consecutiveFailures: {
    type: Number,
    default: 0
  },

  // Job configuration
  configuration: {
    // Maximum consecutive failures before disabling
    maxConsecutiveFailures: {
      type: Number,
      default: 5
    },

    // Timeout for job execution (milliseconds)
    executionTimeout: {
      type: Number,
      default: 300000 // 5 minutes
    },

    // Retry configuration
    retryOnFailure: {
      type: Boolean,
      default: true
    },

    retryDelay: {
      type: Number,
      default: 60000 // 1 minute
    },

    maxRetries: {
      type: Number,
      default: 3
    }
  },

  // Metadata
  metadata: {
    // Original schedule name for reference
    scheduleName: {
      type: String,
      required: true
    },

    // Content type for tracking
    contentType: {
      type: String,
      enum: ['ai-generated', 'template', 'predefined'],
      default: 'ai-generated'
    },

    // Target platforms
    targetPlatforms: [{
      type: String,
      enum: ['facebook', 'instagram', 'linkedin', 'twitter']
    }],

    // Automation frequency
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'per-minute', 'custom'],
      required: true
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'cronjobs'
});

// Compound indexes for better query performance
cronJobSchema.index({ userId: 1, isActive: 1 });
cronJobSchema.index({ scheduleId: 1, isActive: 1 });
cronJobSchema.index({ nextRun: 1, isActive: 1 });
cronJobSchema.index({ lastRun: -1 });
cronJobSchema.index({ 'stats.totalExecutions': -1 });
cronJobSchema.index({ consecutiveFailures: -1 });
cronJobSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
cronJobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
cronJobSchema.methods.markExecution = function(success, error = null, executionTime = 0) {
  this.lastRun = new Date();
  this.stats.totalExecutions += 1;

  if (success) {
    this.stats.successfulExecutions += 1;
    this.consecutiveFailures = 0;
    this.lastError = null;

    // Update average execution time
    if (executionTime > 0) {
      const totalTime = this.stats.averageExecutionTime * (this.stats.totalExecutions - 1) + executionTime;
      this.stats.averageExecutionTime = Math.round(totalTime / this.stats.totalExecutions);
    }
  } else {
    this.stats.failedExecutions += 1;
    this.consecutiveFailures += 1;
    this.errorCount += 1;
    this.lastError = error;

    // Disable job if too many consecutive failures
    if (this.consecutiveFailures >= this.configuration.maxConsecutiveFailures) {
      this.isActive = false;
      console.log(`🚨 Disabled job ${this._id} due to ${this.consecutiveFailures} consecutive failures`);
    }
  }

  return this.save();
};

cronJobSchema.methods.calculateNextRun = function() {
  // This is a simplified calculation - you might want to use a proper cron library
  const now = new Date();
  const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: 24 hours from now

  // You could use a library like 'cron-parser' for accurate next run calculation
  this.nextRun = nextRun;
  return nextRun;
};

cronJobSchema.methods.shouldExecute = function() {
  if (!this.isActive) return false;
  if (this.consecutiveFailures >= this.configuration.maxConsecutiveFailures) return false;

  const now = new Date();
  return !this.nextRun || now >= this.nextRun;
};

cronJobSchema.methods.getSuccessRate = function() {
  if (this.stats.totalExecutions === 0) return 0;
  return Math.round((this.stats.successfulExecutions / this.stats.totalExecutions) * 100);
};

cronJobSchema.methods.disable = function(reason = 'Manual disable') {
  this.isActive = false;
  this.lastError = reason;
  return this.save();
};

cronJobSchema.methods.enable = function() {
  this.isActive = true;
  this.consecutiveFailures = 0;
  this.lastError = null;
  this.calculateNextRun();
  return this.save();
};

cronJobSchema.methods.reset = function() {
  this.stats.totalExecutions = 0;
  this.stats.successfulExecutions = 0;
  this.stats.failedExecutions = 0;
  this.stats.averageExecutionTime = 0;
  this.consecutiveFailures = 0;
  this.errorCount = 0;
  this.lastError = null;
  this.lastRun = null;
  this.calculateNextRun();
  return this.save();
};

// Static methods
cronJobSchema.statics.findActiveJobs = function() {
  return this.find({
    isActive: true,
    deletedAt: null
  });
};

cronJobSchema.statics.findUserJobs = function(userId, activeOnly = true) {
  const query = {
    userId: userId,
    deletedAt: null
  };

  if (activeOnly) {
    query.isActive = true;
  }

  return this.find(query);
};

cronJobSchema.statics.findJobsNeedingExecution = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    deletedAt: null,
    $or: [
      { nextRun: null },
      { nextRun: { $lte: now } }
    ]
  });
};

cronJobSchema.statics.getJobStats = function() {
  return this.aggregate([
    {
      $match: { deletedAt: null }
    },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalExecutions: { $sum: '$stats.totalExecutions' },
        successfulExecutions: { $sum: '$stats.successfulExecutions' },
        failedExecutions: { $sum: '$stats.failedExecutions' },
        averageSuccessRate: {
          $avg: {
            $cond: [
              { $eq: ['$stats.totalExecutions', 0] },
              0,
              { $multiply: [{ $divide: ['$stats.successfulExecutions', '$stats.totalExecutions'] }, 100] }
            ]
          }
        }
      }
    }
  ]);
};

cronJobSchema.statics.getUserJobStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        deletedAt: null
      }
    },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalExecutions: { $sum: '$stats.totalExecutions' },
        successfulExecutions: { $sum: '$stats.successfulExecutions' },
        failedExecutions: { $sum: '$stats.failedExecutions' },
        averageSuccessRate: {
          $avg: {
            $cond: [
              { $eq: ['$stats.totalExecutions', 0] },
              0,
              { $multiply: [{ $divide: ['$stats.successfulExecutions', '$stats.totalExecutions'] }, 100] }
            ]
          }
        }
      }
    }
  ]);
};

// Soft delete
cronJobSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('CronJob', cronJobSchema);