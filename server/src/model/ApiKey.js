// models/ApiKey.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  // owner: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true,
  // },
  name: {
    type: String,
    required: true,
    unique: true,
    index: true, // Ensuring the name field is indexed for uniqueness
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  lastUsed: {
    type: Date,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  scopes: {
    type: [String],
    default: ['basic'],
  },
  deviceUuid: {
    type: String,
    unique: true,
    sparse: true,
  },
});

// Generate a secure API key
apiKeySchema.statics.generateKey = function () {
  return crypto.randomBytes(32).toString('hex');
};

// Check if key is expired
apiKeySchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
