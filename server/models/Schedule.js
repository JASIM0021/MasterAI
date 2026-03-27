const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Schedule name and description
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Schedule type
  type: {
    type: String,
    enum: ['recurring', 'one-time'],
    default: 'recurring'
  },

  // Recurrence pattern
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'per-minute', 'custom'],
      required: true
    },

    // For weekly recurrence
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6,
      validate: {
        validator: function(v) {
          return v >= 0 && v <= 6;
        },
        message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)'
      }
    }],

    // For monthly recurrence
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    },

    // For per-minute recurrence (experimental)
    minuteInterval: {
      type: Number,
      min: 1,
      max: 30, // Maximum 30 minutes interval to prevent abuse
      default: 5,
      validate: {
        validator: function(v) {
          // Only validate if frequency is per-minute
          if (this.frequency === 'per-minute') {
            return v >= 1 && v <= 30;
          }
          return true;
        },
        message: 'Minute interval must be between 1 and 30 minutes'
      }
    },

    // Time configuration
    timeSlots: [{
      hour: {
        type: Number,
        min: 0,
        max: 23,
        required: true
      },
      minute: {
        type: Number,
        min: 0,
        max: 59,
        required: true
      }
    }],

    // Timezone
    timezone: {
      type: String,
      default: 'UTC'
    },

    // Custom cron expression for complex patterns
    cronExpression: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true;
          // Basic cron validation - you might want to use a proper cron validator library
          const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
          return cronRegex.test(v);
        },
        message: 'Invalid cron expression'
      }
    }
  },

  // Content configuration
  content: {
    // Content generation type
    type: {
      type: String,
      enum: ['template', 'ai-generated', 'predefined'],
      default: 'ai-generated'
    },

    // For template-based content
    template: {
      type: String,
      default: null,
      maxlength: 2000
    },

    // For AI-generated content
    aiConfig: {
      topics: [{
        type: String,
        trim: true
      }],
      tone: {
        type: String,
        enum: ['professional', 'casual', 'friendly', 'authoritative', 'humorous', 'inspirational'],
        default: 'professional'
      },
      language: {
        type: String,
        enum: ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'chinese', 'japanese', 'korean', 'hindi', 'arabic'],
        default: 'english'
      },
      keywords: [{
        type: String,
        trim: true
      }],
      contentLength: {
        type: String,
        enum: ['short', 'medium', 'long'],
        default: 'medium'
      },
      contentType: {
        type: String,
        enum: ['text', 'image', 'quote'],
        default: 'text',
        required: true
      },
      includeHashtags: {
        type: Boolean,
        default: true
      },
      maxHashtags: {
        type: Number,
        min: 0,
        max: 30,
        default: 5
      },
      requireApproval: {
        type: Boolean,
        default: true
      },
      autoPublish: {
        type: Boolean,
        default: false
      },
      generationModel: {
        type: String,
        default: 'gemini-2.5-flash'
      }
    },

    // Predefined content pool
    contentPool: [{
      text: {
        type: String,
        required: true
      },
      media: [{
        type: String // URLs to media files
      }],
      used: {
        type: Boolean,
        default: false
      },
      lastUsed: {
        type: Date,
        default: null
      }
    }],

    // Content rotation settings
    rotation: {
      type: String,
      enum: ['sequential', 'random', 'weighted'],
      default: 'sequential'
    }
  },

  // Target platforms and accounts
  targetPlatforms: [{
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
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Schedule status
  isActive: {
    type: Boolean,
    default: true
  },

  // Execution limits
  limits: {
    maxExecutions: {
      type: Number,
      default: null // null means unlimited
    },
    currentExecutions: {
      type: Number,
      default: 0,
      min: 0
    },
    endDate: {
      type: Date,
      default: null
    }
  },

  // Execution tracking
  lastExecution: {
    type: Date,
    default: null
  },

  nextExecution: {
    type: Date,
    default: null
  },

  // Performance tracking
  stats: {
    totalExecutions: {
      type: Number,
      default: 0,
      min: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0,
      min: 0
    },
    failedExecutions: {
      type: Number,
      default: 0,
      min: 0
    },
    averageEngagement: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Error tracking
  lastError: {
    type: String,
    default: null
  },

  errorCount: {
    type: Number,
    default: 0,
    min: 0
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
scheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate next execution time
scheduleSchema.methods.calculateNextExecution = function() {
  if (!this.isActive) return null;

  const now = new Date();
  const userTimezone = this.recurrence.timezone || 'UTC';

  // Convert current time to user's timezone for calculation
  // Note: In production, you might want to use a proper timezone library like moment-timezone

  let nextExecution = null;

  switch (this.recurrence.frequency) {
    case 'daily':
      nextExecution = this.calculateDailyNext(now);
      break;
    case 'weekly':
      nextExecution = this.calculateWeeklyNext(now);
      break;
    case 'monthly':
      nextExecution = this.calculateMonthlyNext(now);
      break;
    case 'per-minute':
      nextExecution = this.calculatePerMinuteNext(now);
      break;
    case 'custom':
      // For custom cron expressions, you'd use a cron library
      // nextExecution = this.calculateCronNext(now);
      break;
  }

  if (nextExecution) {
    this.nextExecution = nextExecution;
    return nextExecution;
  }

  return null;
};

// Helper method for daily recurrence
scheduleSchema.methods.calculateDailyNext = function(now) {
  const timeSlots = this.recurrence.timeSlots;
  if (!timeSlots || timeSlots.length === 0) return null;

  // Find the next time slot today or tomorrow
  for (const slot of timeSlots) {
    const nextTime = new Date(now);
    nextTime.setHours(slot.hour, slot.minute, 0, 0);

    if (nextTime > now) {
      return nextTime;
    }
  }

  // If no slot today, get first slot tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(timeSlots[0].hour, timeSlots[0].minute, 0, 0);

  return tomorrow;
};

// Helper method for weekly recurrence
scheduleSchema.methods.calculateWeeklyNext = function(now) {
  const daysOfWeek = this.recurrence.daysOfWeek;
  const timeSlots = this.recurrence.timeSlots;

  if (!daysOfWeek || daysOfWeek.length === 0 || !timeSlots || timeSlots.length === 0) {
    return null;
  }

  const currentDay = now.getDay();
  let nextExecution = null;

  // Find next execution within the next 7 days
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);
    const checkDay = checkDate.getDay();

    if (daysOfWeek.includes(checkDay)) {
      for (const slot of timeSlots) {
        const slotTime = new Date(checkDate);
        slotTime.setHours(slot.hour, slot.minute, 0, 0);

        if (slotTime > now && (!nextExecution || slotTime < nextExecution)) {
          nextExecution = slotTime;
        }
      }
    }
  }

  return nextExecution;
};

// Helper method for monthly recurrence
scheduleSchema.methods.calculateMonthlyNext = function(now) {
  const dayOfMonth = this.recurrence.dayOfMonth;
  const timeSlots = this.recurrence.timeSlots;

  if (!dayOfMonth || !timeSlots || timeSlots.length === 0) return null;

  // Calculate next occurrence
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(dayOfMonth);
  nextMonth.setHours(timeSlots[0].hour, timeSlots[0].minute, 0, 0);

  return nextMonth;
};

// Helper method for per-minute recurrence (experimental)
scheduleSchema.methods.calculatePerMinuteNext = function(now) {
  const minuteInterval = this.recurrence.minuteInterval || 5;

  // Calculate next execution by adding the interval to current time
  const nextExecution = new Date(now.getTime() + (minuteInterval * 60 * 1000));

  // Round to nearest minute for cleaner scheduling
  nextExecution.setSeconds(0, 0);

  return nextExecution;
};

// Method to mark execution
scheduleSchema.methods.markExecution = function(success = true, error = null) {
  this.lastExecution = new Date();
  this.stats.totalExecutions += 1;
  this.limits.currentExecutions += 1;

  if (success) {
    this.stats.successfulExecutions += 1;
    this.errorCount = 0;
    this.lastError = null;
  } else {
    this.stats.failedExecutions += 1;
    this.errorCount += 1;
    this.lastError = error;
  }

  // Calculate next execution
  this.calculateNextExecution();

  return this.save();
};

// Method to check if schedule should be executed
scheduleSchema.methods.shouldExecute = function() {
  if (!this.isActive) return false;

  // Check execution limits
  if (this.limits.maxExecutions && this.limits.currentExecutions >= this.limits.maxExecutions) {
    return false;
  }

  // Check end date
  if (this.limits.endDate && new Date() > this.limits.endDate) {
    return false;
  }

  // Check if it's time to execute
  if (this.nextExecution && new Date() >= this.nextExecution) {
    return true;
  }

  return false;
};

// Static method to find schedules ready for execution
scheduleSchema.statics.findReadyForExecution = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    nextExecution: { $lte: now },
    $or: [
      { 'limits.maxExecutions': null },
      { $expr: { $lt: ['$limits.currentExecutions', '$limits.maxExecutions'] } }
    ],
    $or: [
      { 'limits.endDate': null },
      { 'limits.endDate': { $gt: now } }
    ]
  });
};

// Static method to find user's active schedules
scheduleSchema.statics.findActiveByUser = function(userId) {
  return this.find({ userId, isActive: true });
};

// Indexes for better query performance
scheduleSchema.index({ userId: 1, isActive: 1 });
scheduleSchema.index({ nextExecution: 1, isActive: 1 });
scheduleSchema.index({ 'targetPlatforms.platform': 1, isActive: 1 });
scheduleSchema.index({ userId: 1, 'recurrence.frequency': 1 });

module.exports = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);