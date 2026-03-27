const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const socialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Platform information
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'linkedin', 'twitter'],
    required: true
  },

  // Account details
  accountId: {
    type: String,
    required: true
  },

  accountName: {
    type: String,
    required: true
  },

  username: {
    type: String,
    default: null
  },

  email: {
    type: String,
    default: null
  },

  profilePicture: {
    type: String,
    default: null
  },

  // Account type (for platforms like Facebook with personal/page accounts)
  accountType: {
    type: String,
    enum: ['personal', 'page', 'business'],
    default: 'personal'
  },

  // For Facebook pages, Instagram business accounts, etc.
  parentAccountId: {
    type: String,
    default: null
  },

  // Encrypted tokens
  accessToken: {
    type: String,
    required: true
  },

  refreshToken: {
    type: String,
    default: null
  },

  // Token metadata
  tokenExpiresAt: {
    type: Date,
    default: null
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  // Last successful connection
  lastConnected: {
    type: Date,
    default: Date.now
  },

  // Connection metadata
  permissions: [{
    type: String
  }],

  // Platform-specific data
  platformData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Encryption key from environment
const ENCRYPTION_KEY = process.env.SOCIAL_ENCRYPTION_KEY || 'master-ai-social-encryption-key-2024';

// Encrypt access token before saving
socialAccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Encrypt access token if it's modified and not already encrypted
  if (this.isModified('accessToken') && this.accessToken && !this.accessToken.startsWith('encrypted:')) {
    this.accessToken = 'encrypted:' + CryptoJS.AES.encrypt(this.accessToken, ENCRYPTION_KEY).toString();
  }

  // Encrypt refresh token if it exists and is modified
  if (this.isModified('refreshToken') && this.refreshToken && !this.refreshToken.startsWith('encrypted:')) {
    this.refreshToken = 'encrypted:' + CryptoJS.AES.encrypt(this.refreshToken, ENCRYPTION_KEY).toString();
  }

  next();
});

// Method to decrypt access token
socialAccountSchema.methods.getDecryptedAccessToken = function() {
  if (!this.accessToken) return null;

  if (this.accessToken.startsWith('encrypted:')) {
    const encrypted = this.accessToken.substring(10); // Remove 'encrypted:' prefix
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  return this.accessToken; // Return as-is if not encrypted (for backward compatibility)
};

// Method to decrypt refresh token
socialAccountSchema.methods.getDecryptedRefreshToken = function() {
  if (!this.refreshToken) return null;

  if (this.refreshToken.startsWith('encrypted:')) {
    const encrypted = this.refreshToken.substring(10); // Remove 'encrypted:' prefix
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  return this.refreshToken; // Return as-is if not encrypted (for backward compatibility)
};

// Method to check if token is expired
socialAccountSchema.methods.isTokenExpired = function() {
  if (!this.tokenExpiresAt) return false;
  return new Date() >= this.tokenExpiresAt;
};

// Method to mark account as connected
socialAccountSchema.methods.markConnected = function() {
  this.isActive = true;
  this.lastConnected = new Date();
  this.lastError = null;
  this.errorCount = 0;
  return this.save();
};

// Method to mark account as disconnected with error
socialAccountSchema.methods.markDisconnected = function(error) {
  this.isActive = false;
  this.lastError = error;
  this.errorCount += 1;
  return this.save();
};

// Static method to find accounts by platform
socialAccountSchema.statics.findByPlatform = function(userId, platform) {
  return this.find({ userId, platform, isActive: true });
};

// Static method to find account by platform and account ID
socialAccountSchema.statics.findByPlatformAccount = function(userId, platform, accountId) {
  return this.findOne({ userId, platform, accountId });
};

// Indexes for better query performance
socialAccountSchema.index({ userId: 1, platform: 1 });
socialAccountSchema.index({ userId: 1, platform: 1, accountId: 1 }, { unique: true });
socialAccountSchema.index({ platform: 1, isActive: 1 });
socialAccountSchema.index({ tokenExpiresAt: 1 });

module.exports = mongoose.models.SocialAccount || mongoose.model('SocialAccount', socialAccountSchema);