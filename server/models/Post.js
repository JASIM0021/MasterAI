const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Post content
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 5000
    },
    hashtags: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^#[a-zA-Z0-9_]+$/.test(v);
        },
        message: 'Invalid hashtag format'
      }
    }],
    mentions: [{
      type: String
    }]
  },

  // Media attachments
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String,
      default: null
    },
    altText: {
      type: String,
      default: null
    },
    size: {
      type: Number,
      default: 0
    },
    dimensions: {
      width: Number,
      height: Number
    }
  }],

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
    platformSpecificContent: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'published', 'failed', 'cancelled'],
      default: 'pending'
    },
    publishedAt: {
      type: Date,
      default: null
    },
    platformPostId: {
      type: String,
      default: null
    },
    platformPostUrl: {
      type: String,
      default: null
    },
    error: {
      type: String,
      default: null
    },
    metrics: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: null }
    }
  }],

  // Scheduling information
  scheduling: {
    type: {
      type: String,
      enum: ['immediate', 'scheduled', 'automated'],
      default: 'immediate'
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    automationRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null
    }
  },

  // Post classification
  category: {
    type: String,
    enum: ['technology', 'business', 'lifestyle', 'education', 'entertainment', 'news', 'personal', 'promotional', 'other','automation'],
    default: 'other'
  },

  tags: [{
    type: String,
    trim: true
  }],

  // Post status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed', 'cancelled', 'pending_approval', 'approved', 'rejected'],
    default: 'draft'
  },

  // Approval workflow
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: {
      type: Date,
      default: null
    },
    emailNotificationSent: {
      type: Boolean,
      default: false
    },
    pushNotificationSent: {
      type: Boolean,
      default: false
    },
    approvalToken: {
      type: String,
      default: null
    },
    approvalTokenExpiresAt: {
      type: Date,
      default: null
    }
  },

  // Publishing attempts
  publishAttempts: {
    type: Number,
    default: 0,
    min: 0
  },

  lastPublishAttempt: {
    type: Date,
    default: null
  },

  // Social media publishing results
  socialMediaResults: [{
    platform: {
      type: String,
      required: true
    },
    accountName: {
      type: String,
      required: true
    },
    success: {
      type: Boolean,
      required: true
    },
    platformPostId: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    },
    error: {
      type: String,
      default: null
    },
    publishedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Publishing error message
  publishError: {
    type: String,
    default: null
  },

  // Analytics
  totalEngagement: {
    type: Number,
    default: 0
  },

  // AI-generated content flags
  isAiGenerated: {
    type: Boolean,
    default: false
  },

  aiPrompt: {
    type: String,
    default: null
  },

  // AI generation details
  aiGeneration: {
    prompt: {
      type: String,
      default: null
    },
    topic: {
      type: String,
      default: null
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'friendly', 'authoritative', 'humorous', 'inspirational'],
      default: null
    },
    contentType: {
      type: String,
      enum: ['text', 'image', 'quote'],
      default: 'text'
    },
    generatedAt: {
      type: Date,
      default: null
    },
    generationModel: {
      type: String,
      default: null
    },
    generationCost: {
      type: Number,
      default: 0
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
  }
});

// Update the updatedAt field before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get overall post status
postSchema.methods.getOverallStatus = function() {
  if (this.targetPlatforms.length === 0) return 'draft';

  const statuses = this.targetPlatforms.map(p => p.status);

  if (statuses.every(s => s === 'published')) return 'published';
  if (statuses.some(s => s === 'failed')) return 'failed';
  if (statuses.some(s => s === 'scheduled')) return 'scheduled';
  if (statuses.some(s => s === 'pending')) return 'pending';

  return 'draft';
};

// Method to update platform status
postSchema.methods.updatePlatformStatus = function(platform, accountId, status, data = {}) {
  const platformPost = this.targetPlatforms.find(p =>
    p.platform === platform && p.accountId === accountId
  );

  if (platformPost) {
    platformPost.status = status;

    if (data.publishedAt) platformPost.publishedAt = data.publishedAt;
    if (data.platformPostId) platformPost.platformPostId = data.platformPostId;
    if (data.platformPostUrl) platformPost.platformPostUrl = data.platformPostUrl;
    if (data.error) platformPost.error = data.error;

    // Update overall post status
    this.status = this.getOverallStatus();

    return this.save();
  }

  throw new Error('Platform not found for this post');
};

// Method to calculate total engagement
postSchema.methods.calculateTotalEngagement = function() {
  let total = 0;

  this.targetPlatforms.forEach(platform => {
    if (platform.metrics) {
      total += (platform.metrics.likes || 0);
      total += (platform.metrics.shares || 0);
      total += (platform.metrics.comments || 0);
    }
  });

  this.totalEngagement = total;
  return this.save();
};

// Method to check if post is ready to publish
postSchema.methods.isReadyToPublish = function() {
  if (!this.content.text || this.content.text.trim().length === 0) {
    return { ready: false, reason: 'Post content is required' };
  }

  if (this.targetPlatforms.length === 0) {
    return { ready: false, reason: 'At least one target platform is required' };
  }

  const now = new Date();
  if (this.scheduling.type === 'scheduled' && this.scheduling.scheduledAt <= now) {
    return { ready: false, reason: 'Scheduled time must be in the future' };
  }

  return { ready: true };
};

// Static method to find posts by status
postSchema.statics.findByStatus = function(userId, status) {
  return this.find({ userId, status });
};

// Static method to find scheduled posts ready for publishing
postSchema.statics.findReadyForPublishing = function() {
  const now = new Date();
  return this.find({
    'scheduling.type': 'scheduled',
    'scheduling.scheduledAt': { $lte: now },
    status: 'scheduled'
  });
};

// Static method to find posts by platform
postSchema.statics.findByPlatform = function(userId, platform) {
  return this.find({
    userId,
    'targetPlatforms.platform': platform
  });
};

// Method to approve post
postSchema.methods.approvePost = async function(publishImmediately = true) {
  this.approval.status = 'approved';
  this.approval.approvedAt = new Date();
  this.status = 'approved';

  await this.save();

  // If publishImmediately is true, attempt to publish to social media platforms
  if (publishImmediately && this.targetPlatforms && this.targetPlatforms.length > 0) {
    try {
      const SocialMediaPublishingService = require('../services/socialMediaPublishingService');
      const publishingService = new SocialMediaPublishingService();

      // Get user information
      const User = require('./User');
      const user = await User.findById(this.userId);

      if (user) {
        // Filter platforms that are enabled for publishing
        const enabledPlatforms = this.targetPlatforms.filter(p => p.autoPublish !== false);

        if (enabledPlatforms.length > 0) {
          console.log(`🚀 Publishing post ${this._id} to ${enabledPlatforms.length} platforms...`);

          const publishResult = await publishingService.publishToMultiplePlatforms(
            this,
            enabledPlatforms,
            user
          );

          // Update post with publishing results
          this.socialMediaResults = publishResult.results;
          this.publishedAt = new Date();
          this.publishAttempts = (this.publishAttempts || 0) + 1;
          this.lastPublishAttempt = new Date();

          // Update status based on publishing success
          if (publishResult.success) {
            this.status = 'published';
            console.log(`✅ Post ${this._id} published successfully to ${publishResult.successCount}/${publishResult.totalPlatforms} platforms`);
          } else {
            this.status = 'publish_failed';
            console.log(`❌ Post ${this._id} failed to publish to all platforms`);
          }

          await this.save();
        }
      }
    } catch (error) {
      console.error(`❌ Error publishing post ${this._id}:`, error.message);

      // Update post with error information
      this.status = 'publish_failed';
      this.publishAttempts = (this.publishAttempts || 0) + 1;
      this.lastPublishAttempt = new Date();
      this.publishError = error.message;

      await this.save();
    }
  }

  return this;
};

// Method to reject post
postSchema.methods.rejectPost = function(reason) {
  this.approval.status = 'rejected';
  this.approval.rejectedAt = new Date();
  this.approval.rejectionReason = reason;
  this.status = 'rejected';
  return this.save();
};

// Method to generate approval token
postSchema.methods.generateApprovalToken = function() {
  const crypto = require('crypto');
  this.approval.approvalToken = crypto.randomBytes(32).toString('hex');
  this.approval.approvalTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return this.save();
};

// Method to mark notification as sent
postSchema.methods.markNotificationSent = function(type = 'both') {
  this.approval.notificationSent = true;
  this.approval.notificationSentAt = new Date();

  if (type === 'email' || type === 'both') {
    this.approval.emailNotificationSent = true;
  }
  if (type === 'push' || type === 'both') {
    this.approval.pushNotificationSent = true;
  }

  return this.save();
};

// Static method to find pending approval posts
postSchema.statics.findPendingApproval = function(userId) {
  return this.find({
    userId,
    'approval.status': 'pending',
    status: 'pending_approval'
  }).sort({ createdAt: -1 });
};

// Static method to find posts needing notifications
postSchema.statics.findNeedingNotification = function() {
  return this.find({
    'approval.status': 'pending',
    'approval.notificationSent': false,
    status: 'pending_approval'
  });
};

// Indexes for better query performance
postSchema.index({ userId: 1, status: 1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ 'scheduling.scheduledAt': 1, status: 1 });
postSchema.index({ 'targetPlatforms.platform': 1, 'targetPlatforms.status': 1 });
postSchema.index({ category: 1, userId: 1 });
postSchema.index({ 'scheduling.automationRuleId': 1 });
postSchema.index({ 'approval.status': 1, status: 1 });
postSchema.index({ 'approval.notificationSent': 1, status: 1 });
postSchema.index({ 'approval.approvalToken': 1 });

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);