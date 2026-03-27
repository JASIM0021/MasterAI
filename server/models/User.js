const mongoose = require('mongoose');
const Credit = require('./Credit');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  authProvider: {
    type: String,
    enum: ['google', 'facebook', 'email'],
    required: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'admin'],
      default: 'free'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    paymentMethod: {
      type: String,
      default: null
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'english'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Device tokens for push notifications
  deviceTokens: [{
    token: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'unknown'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }]
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Credit management methods (Updated to use Global Credit system)
userSchema.methods.hasGlobalCredits = async function(service, customCost = null) {
  const credits = await Credit.findOrCreateForUser(this._id);
  return credits.canUseGlobalService(service, customCost);
};

userSchema.methods.hasAutomationCredits = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  const automationCost = credits.getServiceCost('automation');
  return credits.globalCredits.balance >= automationCost;
};

userSchema.methods.hasExecutionCredits = async function(hasImage = false) {
  const credits = await Credit.findOrCreateForUser(this._id);
  const executionCost = hasImage ? credits.getServiceCost('executionWithImage') : credits.getServiceCost('execution');
  return credits.globalCredits.balance >= executionCost;
};

userSchema.methods.consumeGlobalCredits = async function(service, customCost = null) {
  const credits = await Credit.findOrCreateForUser(this._id);
  return credits.deductGlobalCredits(service, customCost);
};

userSchema.methods.consumeAutomationCredit = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  return credits.deductGlobalCredits('automation');
};

userSchema.methods.consumeExecutionCredit = async function(hasImage = false) {
  const credits = await Credit.findOrCreateForUser(this._id);
  const service = hasImage ? 'executionWithImage' : 'execution';
  return credits.deductGlobalCredits(service);
};

userSchema.methods.restoreAutomationCredit = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  const automationCost = credits.getServiceCost('automation');
  // Add credits back to global balance
  credits.globalCredits.balance += automationCost;
  credits.updatedAt = Date.now();
  return credits.save();
};

userSchema.methods.getAvailableGlobalCredits = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  return credits.globalCredits.balance;
};

userSchema.methods.getAvailableAutomationCredits = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  const automationCost = credits.getServiceCost('automation');
  return Math.floor(credits.globalCredits.balance / automationCost);
};

userSchema.methods.getAvailableExecutionCredits = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  const executionCost = credits.getServiceCost('execution');
  return Math.floor(credits.globalCredits.balance / executionCost);
};

// Legacy method - credit management now handled by Credit model
userSchema.methods.checkAndResetCredits = async function() {
  // Credits are now automatically managed by the Credit model
  // This method is kept for backward compatibility but does nothing
  return Promise.resolve(this);
};

userSchema.methods.getCreditInfo = async function() {
  const credits = await Credit.findOrCreateForUser(this._id);
  return credits.getGlobalCreditInfo();
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ facebookId: 1 });
userSchema.index({ 'subscription.plan': 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);