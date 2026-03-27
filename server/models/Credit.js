const mongoose = require('mongoose');

const creditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Global credit system - unified credits for all services
  globalCredits: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPurchased: {
      type: Number,
      default: 0,
      min: 0
    },
    totalUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    // Track when global credit system was enabled for this user
    enabledAt: {
      type: Date,
      default: null
    }
  },

  // Credit costs for different services (in global credits)
  serviceCosts: {
    postGeneration: {
      type: Number,
      default: 5 // Manual post creation costs 5 credits
    },
    captionGeneration: {
      type: Number,
      default: 5 // Caption generation costs 5 credits
    },
    aiImageEdit: {
      type: Number,
      default: 5 // Image edit costs 5 credits
    },
    aiImageGeneration: {
      type: Number,
      default: 5 // Image generation costs 5 credits
    },
    videoGeneration: {
      type: Number,
      default: 20 // Video generation costs 20 credits
    },
    automation: {
      type: Number,
      default: 10 // Automation creation costs 10 credits
    },
    execution: {
      type: Number,
      default: 5 // Automation execution (text only) costs 5 credits
    },
    executionWithImage: {
      type: Number,
      default: 15 // Automation execution (image + text) costs 15 credits
    }
  },

  // Post generation credits
  postGeneration: {
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 50,
      min: 0
    }
  },

  // Caption generation credits
  captionGeneration: {
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 50,
      min: 0
    }
  },

  // AI image editing credits
  aiImageEdit: {
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 50,
      min: 0
    }
  },

  // AI image generation credits
  aiImageGeneration: {
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 50,
      min: 0
    }
  },

  // Social automation credits
  automation: {
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 3,
      min: 0
    },
    available: {
      type: Number,
      default: 3,
      min: 0
    },
    resetDate: {
      type: Date,
      default: () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      }
    },
    resetInterval: {
      type: String,
      default: 'monthly'
    }
  },

  // Automation execution credits
  execution: {
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 10,
      min: 0
    },
    available: {
      type: Number,
      default: 10,
      min: 0
    },
    executionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastExecution: {
      type: Date,
      default: null
    },
    resetDate: {
      type: Date,
      default: () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      }
    },
    resetInterval: {
      type: String,
      default: 'monthly'
    }
  },

  // Monthly reset tracking
  currentMonth: {
    type: Number,
    default: () => new Date().getMonth()
  },
  currentYear: {
    type: Number,
    default: () => new Date().getFullYear()
  },

  // Last reset date
  lastReset: {
    type: Date,
    default: Date.now
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
creditSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if credits need monthly reset
creditSchema.methods.needsMonthlyReset = function() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return (this.currentMonth !== currentMonth || this.currentYear !== currentYear);
};

// Method to add monthly credits (accumulative, not reset)
creditSchema.methods.addMonthlyCredits = function() {
  const now = new Date();
  const nextMonthReset = new Date();
  nextMonthReset.setMonth(nextMonthReset.getMonth() + 1, 1);
  nextMonthReset.setHours(0, 0, 0, 0);

  // ADD 100 credits to existing global credit balance (don't reset to 100)
  if (this.isGlobalCreditsEnabled()) {
    this.globalCredits.balance += 100;
    console.log(`💰 Added 100 monthly credits to user ${this.userId}. New balance: ${this.globalCredits.balance}`);
  } else {
    // For users not yet migrated, enable global credits with 100 credits
    this.enableGlobalCredits(100);
    console.log(`💰 Enabled global credits for user ${this.userId} with 100 monthly credits`);
  }

  // Legacy credit reset (for backward compatibility, but will be deprecated)
  this.postGeneration.used = 0;
  this.captionGeneration.used = 0;
  this.aiImageEdit.used = 0;
  this.aiImageGeneration.used = 0;

  // Reset automation credits (legacy)
  this.automation.used = 0;
  this.automation.available = this.automation.total;
  this.automation.resetDate = nextMonthReset;

  // Reset execution credits (legacy)
  this.execution.used = 0;
  this.execution.available = this.execution.total;
  this.execution.executionCount = 0;
  this.execution.resetDate = nextMonthReset;

  this.currentMonth = now.getMonth();
  this.currentYear = now.getFullYear();
  this.lastReset = now;
  this.updatedAt = now;

  return this.save();
};

// Keep old method name for backward compatibility
creditSchema.methods.resetMonthlyCredits = function() {
  return this.addMonthlyCredits();
};

// Method to deduct credit for a service
creditSchema.methods.deductCredit = function(service) {
  if (!this[service]) {
    throw new Error(`Invalid service: ${service}`);
  }

  if (this[service].used >= this[service].total) {
    throw new Error(`No credits remaining for ${service}`);
  }

  this[service].used += 1;
  this.updatedAt = Date.now();

  return this.save();
};

// Method to get remaining credits for a service
creditSchema.methods.getRemainingCredits = function(service) {
  if (!this[service]) {
    return 0;
  }

  return Math.max(0, this[service].total - this[service].used);
};

// Method to check if user can use a service
creditSchema.methods.canUseService = function(service) {
  return this.getRemainingCredits(service) > 0;
};

// Static method to find or create credits for user
creditSchema.statics.findOrCreateForUser = async function(userId) {
  let credits = await this.findOne({ userId });

  if (!credits) {
    const nextMonthReset = new Date();
    nextMonthReset.setMonth(nextMonthReset.getMonth() + 1, 1);
    nextMonthReset.setHours(0, 0, 0, 0);

    credits = new this({
      userId: userId,
      postGeneration: { used: 0, total: 50 },
      captionGeneration: { used: 0, total: 50 },
      aiImageEdit: { used: 0, total: 50 },
      aiImageGeneration: { used: 0, total: 50 },
      automation: {
        used: 0,
        total: 10,
        available: 10,
        resetDate: nextMonthReset,
        resetInterval: 'monthly'
      },
      execution: {
        used: 0,
        total: 100,
        available: 100,
        executionCount: 0,
        lastExecution: null,
        resetDate: nextMonthReset,
        resetInterval: 'monthly'
      }
    });

    await credits.save();
  } else if (credits.needsMonthlyReset()) {
    await credits.resetMonthlyCredits();
  }

  return credits;
};

// Method to deduct automation credit
creditSchema.methods.deductAutomationCredit = function() {
  if (this.automation.used >= this.automation.total) {
    throw new Error('No automation credits remaining');
  }

  this.automation.used += 1;
  this.automation.available = Math.max(0, this.automation.total - this.automation.used);
  this.updatedAt = Date.now();

  return this.save();
};

// Method to deduct execution credit
creditSchema.methods.deductExecutionCredit = function() {
  if (this.execution.used >= this.execution.total) {
    throw new Error('No execution credits remaining');
  }

  this.execution.used += 1;
  this.execution.available = Math.max(0, this.execution.total - this.execution.used);
  this.execution.executionCount += 1;
  this.execution.lastExecution = new Date();
  this.updatedAt = Date.now();

  return this.save();
};

// Method to check if user can create automation
creditSchema.methods.canCreateAutomation = function() {
  return this.automation.available > 0 && this.automation.used < this.automation.total;
};

// Method to check if user can execute automation
creditSchema.methods.canExecuteAutomation = function() {
  return this.execution.available > 0 && this.execution.used < this.execution.total;
};

// Method to get automation credits info
creditSchema.methods.getAutomationCreditsInfo = function() {
  return {
    automation: {
      total: this.automation.total,
      used: this.automation.used,
      available: this.automation.available,
      resetDate: this.automation.resetDate.toISOString(),
      resetInterval: this.automation.resetInterval
    },
    execution: {
      total: this.execution.total,
      used: this.execution.used,
      available: this.execution.available,
      executionCount: this.execution.executionCount,
      lastExecution: this.execution.lastExecution ? this.execution.lastExecution.toISOString() : null,
      resetDate: this.execution.resetDate.toISOString(),
      resetInterval: this.execution.resetInterval
    }
  };
};

// ==================== GLOBAL CREDIT SYSTEM METHODS ====================

// Method to enable global credit system for user
creditSchema.methods.enableGlobalCredits = function(initialBalance = 0) {
  if (!this.globalCredits.enabledAt) {
    this.globalCredits.enabledAt = new Date();
    this.globalCredits.balance = initialBalance;
    this.globalCredits.totalPurchased = initialBalance;
  }
  return this.save();
};

// Method to check if global credit system is enabled for user
creditSchema.methods.isGlobalCreditsEnabled = function() {
  return this.globalCredits.enabledAt !== null;
};

// Method to add global credits (for purchases)
creditSchema.methods.addGlobalCredits = async function(amount, source = 'purchase') {
  if (!this.isGlobalCreditsEnabled()) {
    await this.enableGlobalCredits(amount);
    return this;
  }

  this.globalCredits.balance += amount;
  if (source === 'purchase') {
    this.globalCredits.totalPurchased += amount;
  }
  this.updatedAt = Date.now();

  return this.save();
};

// Method to deduct global credits for a service
creditSchema.methods.deductGlobalCredits = async function(service, customCost = null) {
  if (!this.isGlobalCreditsEnabled()) {
    throw new Error('Global credit system not enabled for this user');
  }

  const cost = customCost || this.serviceCosts[service];
  if (!cost) {
    throw new Error(`Invalid service: ${service}`);
  }

  if (this.globalCredits.balance < cost) {
    throw new Error(`Insufficient global credits. Required: ${cost}, Available: ${this.globalCredits.balance}`);
  }

  const balanceBefore = this.globalCredits.balance;

  this.globalCredits.balance -= cost;
  this.globalCredits.totalUsed += cost;
  this.updatedAt = Date.now();

  await this.save();

  // Log the transaction - use dynamic import to avoid circular dependency
  try {
    const CreditTransaction = require('./CreditTransaction');
    await CreditTransaction.logTransaction({
      userId: this.userId,
      type: 'deduction',
      amount: -cost,
      service,
      description: `${service} service usage`,
      metadata: {
        creditCost: cost,
        source: 'service_usage'
      }
    });
  } catch (transactionError) {
    console.warn('Failed to log credit transaction:', transactionError.message);
    // Don't throw - the credit deduction was successful
  }

  return this;
};

// Method to check if user can use a service with global credits
creditSchema.methods.canUseGlobalService = function(service, customCost = null) {
  if (!this.isGlobalCreditsEnabled()) {
    return false;
  }

  const cost = customCost || this.serviceCosts[service];
  if (!cost) {
    return false;
  }

  return this.globalCredits.balance >= cost;
};

// Method to get service cost
creditSchema.methods.getServiceCost = function(service) {
  return this.serviceCosts[service] || 0;
};

// Method to get global credit info
creditSchema.methods.getGlobalCreditInfo = function() {
  return {
    enabled: this.isGlobalCreditsEnabled(),
    balance: this.globalCredits.balance || 0,
    totalPurchased: this.globalCredits.totalPurchased || 0,
    totalUsed: this.globalCredits.totalUsed || 0,
    enabledAt: this.globalCredits.enabledAt,
    serviceCosts: this.serviceCosts
  };
};

// Method to migrate user to global credits (converts existing credits)
creditSchema.methods.migrateToGlobalCredits = async function() {
  if (this.isGlobalCreditsEnabled()) {
    return this; // Already migrated
  }

  // Calculate total remaining credits from legacy system
  const legacyCreditsRemaining =
    this.getRemainingCredits('postGeneration') +
    this.getRemainingCredits('captionGeneration') +
    this.getRemainingCredits('aiImageEdit') +
    this.getRemainingCredits('aiImageGeneration') +
    (this.automation?.available || 0) +
    (this.execution?.available || 0);

  // Enable global credits with converted balance
  await this.enableGlobalCredits(legacyCreditsRemaining);

  // Log the migration
  if (legacyCreditsRemaining > 0) {
    try {
      const CreditTransaction = require('./CreditTransaction');
      await CreditTransaction.logTransaction({
        userId: this.userId,
        type: 'bonus',
        amount: legacyCreditsRemaining,
        description: 'Migration from legacy credit system to global credits',
        metadata: {
          source: 'system_migration',
          notes: 'Converted legacy credits to global credits'
        }
      });
    } catch (transactionError) {
      console.warn('Failed to log migration transaction:', transactionError.message);
      // Don't throw - the migration was successful
    }
  }

  return this;
};

// Enhanced findOrCreateForUser method with global credit support
creditSchema.statics.findOrCreateForUser = async function(userId, enableGlobal = true) {
  let credits = await this.findOne({ userId });

  if (!credits) {
    const nextMonthReset = new Date();
    nextMonthReset.setMonth(nextMonthReset.getMonth() + 1, 1);
    nextMonthReset.setHours(0, 0, 0, 0);

    const creditData = {
      userId: userId,
      // Legacy credit pools (for backward compatibility)
      postGeneration: { used: 0, total: 50 },
      captionGeneration: { used: 0, total: 50 },
      aiImageEdit: { used: 0, total: 50 },
      aiImageGeneration: { used: 0, total: 50 },
      automation: {
        used: 0,
        total: 10,
        available: 10,
        resetDate: nextMonthReset,
        resetInterval: 'monthly'
      },
      execution: {
        used: 0,
        total: 100,
        available: 100,
        executionCount: 0,
        lastExecution: null,
        resetDate: nextMonthReset,
        resetInterval: 'monthly'
      },
      // Global credit system (always enabled for new users)
      globalCredits: {
        balance: 100, // Start new users with 100 credits
        totalPurchased: 0,
        totalUsed: 0,
        enabledAt: new Date()
      }
    };

    credits = new this(creditData);
    await credits.save();

    // Log initial 100 credits for new users
    try {
      const CreditTransaction = require('./CreditTransaction');
      await CreditTransaction.logTransaction({
        userId: userId,
        type: 'bonus',
        amount: 100,
        description: 'Welcome bonus - 100 free credits',
        metadata: {
          source: 'welcome_bonus',
          notes: 'Initial credits for new user'
        }
      });
    } catch (transactionError) {
      console.warn('Failed to log welcome bonus transaction:', transactionError.message);
      // Don't throw - the user creation was successful
    }
  } else if (credits.needsMonthlyReset()) {
    await credits.addMonthlyCredits();
  }

  return credits;
};

// Method to get unified credit status (prioritizes global credits if enabled)
creditSchema.methods.getUnifiedCreditStatus = function() {
  if (this.isGlobalCreditsEnabled()) {
    return {
      type: 'global',
      balance: this.globalCredits.balance,
      totalPurchased: this.globalCredits.totalPurchased,
      totalUsed: this.globalCredits.totalUsed,
      serviceCosts: this.serviceCosts,
      enabledAt: this.globalCredits.enabledAt
    };
  } else {
    return {
      type: 'legacy',
      services: {
        postGeneration: {
          used: this.postGeneration.used,
          total: this.postGeneration.total,
          remaining: this.getRemainingCredits('postGeneration')
        },
        captionGeneration: {
          used: this.captionGeneration.used,
          total: this.captionGeneration.total,
          remaining: this.getRemainingCredits('captionGeneration')
        },
        aiImageEdit: {
          used: this.aiImageEdit.used,
          total: this.aiImageEdit.total,
          remaining: this.getRemainingCredits('aiImageEdit')
        },
        aiImageGeneration: {
          used: this.aiImageGeneration.used,
          total: this.aiImageGeneration.total,
          remaining: this.getRemainingCredits('aiImageGeneration')
        },
        automation: this.getAutomationCreditsInfo().automation,
        execution: this.getAutomationCreditsInfo().execution
      }
    };
  }
};

// Index for better query performance
creditSchema.index({ userId: 1 });
creditSchema.index({ currentMonth: 1, currentYear: 1 });
creditSchema.index({ 'globalCredits.enabledAt': 1 });

module.exports = mongoose.model('Credit', creditSchema);