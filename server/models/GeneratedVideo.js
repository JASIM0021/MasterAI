const mongoose = require('mongoose');

const generatedVideoSchema = new mongoose.Schema({
  // User who generated the video
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Template used (if any)
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoTemplate',
    default: null
  },

  // Template metadata for JSON templates (since they use string IDs)
  templateMetadata: {
    id: {
      type: String,
      default: null
    },
    name: {
      type: String,
      default: null
    },
    category: {
      type: String,
      default: null
    }
  },

  // Generation details
  generationType: {
    type: String,
    enum: ['custom_prompt', 'template', 'template_with_photo'],
    required: true
  },

  // Prompt and configuration
  prompt: {
    original: {
      type: String,
      required: true,
      maxlength: 2000
    },
    processed: {
      type: String,
      maxlength: 3000 // May be longer after processing
    }
  },

  // User uploaded image (if used)
  userImage: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String, // Cloudinary public ID for deletion
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },

  // Video generation configuration
  config: {
    duration: {
      type: Number,
      default: 8,
      min: 1,
      max: 8
    },
    aspectRatio: {
      type: String,
      enum: ['16:9', '9:16', '1:1'],
      default: '16:9'
    },
    quality: {
      type: String,
      enum: ['standard', 'high'],
      default: 'standard'
    },
    aiSettings: {
      creativity: {
        type: Number,
        min: 0.1,
        max: 1.0,
        default: 0.7
      },
      guidance: {
        type: Number,
        min: 1,
        max: 20,
        default: 7
      }
    }
  },

  // Generation status and progress
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Progress tracking (0-100)
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // External API details
  externalJobId: {
    type: String, // Veo3/Google AI job ID
    default: null
  },

  // Generated video details
  video: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String, // Cloudinary public ID
      default: null
    },
    duration: {
      type: Number, // Actual duration in seconds
      default: null
    },
    size: {
      type: Number, // File size in bytes
      default: null
    },
    format: {
      type: String,
      default: 'mp4'
    },
    resolution: {
      width: Number,
      height: Number
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },

  // Thumbnail for the generated video
  thumbnail: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String, // Cloudinary public ID
      default: null
    }
  },

  // Credit and billing
  creditCost: {
    type: Number,
    required: true,
    default: 20
  },
  creditDeducted: {
    type: Boolean,
    default: false
  },
  creditDeductedAt: {
    type: Date,
    default: null
  },

  // Error handling
  error: {
    message: {
      type: String,
      default: null
    },
    code: {
      type: String,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    occurredAt: {
      type: Date,
      default: null
    }
  },

  // Processing times
  timing: {
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    totalDuration: {
      type: Number, // Total time in seconds
      default: null
    }
  },

  // User interaction
  isFavorite: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date,
    default: null
  },

  // Sharing and social
  shareCount: {
    type: Number,
    default: 0
  },
  sharedPlatforms: [{
    platform: String,
    sharedAt: Date
  }],

  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceInfo: {
      platform: String,
      os: String,
      version: String
    }
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
generatedVideoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to mark video as processing
generatedVideoSchema.methods.markAsProcessing = function(externalJobId = null) {
  this.status = 'processing';
  this.progress = 10;
  this.timing.startedAt = new Date();
  if (externalJobId) {
    this.externalJobId = externalJobId;
  }
  return this.save();
};

// Method to update progress
generatedVideoSchema.methods.updateProgress = function(progress) {
  this.progress = Math.min(100, Math.max(0, progress));
  return this.save();
};

// Method to mark video as completed
generatedVideoSchema.methods.markAsCompleted = function(videoData) {
  this.status = 'completed';
  this.progress = 100;
  this.timing.completedAt = new Date();

  if (this.timing.startedAt) {
    this.timing.totalDuration = Math.floor((this.timing.completedAt - this.timing.startedAt) / 1000);
  }

  if (videoData) {
    this.video = {
      ...this.video,
      ...videoData,
      uploadedAt: new Date()
    };
  }

  return this.save();
};

// Method to mark video as failed
generatedVideoSchema.methods.markAsFailed = function(errorInfo) {
  this.status = 'failed';
  this.error = {
    message: errorInfo.message || 'Video generation failed',
    code: errorInfo.code || 'GENERATION_ERROR',
    details: errorInfo.details || null,
    occurredAt: new Date()
  };
  this.timing.completedAt = new Date();

  if (this.timing.startedAt) {
    this.timing.totalDuration = Math.floor((this.timing.completedAt - this.timing.startedAt) / 1000);
  }

  return this.save();
};

// Method to deduct credits (only call on success)
generatedVideoSchema.methods.deductCredits = async function() {
  if (this.creditDeducted) {
    throw new Error('Credits already deducted for this video');
  }

  if (this.status !== 'completed') {
    throw new Error('Cannot deduct credits for incomplete video');
  }

  try {
    const Credit = require('./Credit');
    const credit = await Credit.findOne({ userId: this.userId });

    if (!credit) {
      throw new Error('User credit record not found');
    }

    await credit.deductGlobalCredits('videoGeneration', this.creditCost);

    this.creditDeducted = true;
    this.creditDeductedAt = new Date();
    await this.save();

    return true;
  } catch (error) {
    console.error('Credit deduction failed:', error);
    throw error;
  }
};

// Method to increment view count
generatedVideoSchema.methods.incrementView = function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

// Method to increment share count
generatedVideoSchema.methods.incrementShare = function(platform) {
  this.shareCount += 1;
  this.sharedPlatforms.push({
    platform: platform,
    sharedAt: new Date()
  });
  return this.save();
};

// Method to toggle favorite status
generatedVideoSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Static method to get user's videos
generatedVideoSchema.statics.getUserVideos = function(userId, options = {}) {
  const {
    status = null,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('templateId', 'name category thumbnail')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to get user's favorite videos
generatedVideoSchema.statics.getUserFavorites = function(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.find({
    userId,
    isFavorite: true,
    status: 'completed'
  })
    .populate('templateId', 'name category thumbnail')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get videos by status
generatedVideoSchema.statics.getVideosByStatus = function(status, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({ status })
    .populate('userId', 'name email')
    .populate('templateId', 'name category')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to cleanup old failed videos
generatedVideoSchema.statics.cleanupOldFailedVideos = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    status: 'failed',
    createdAt: { $lt: cutoffDate }
  });
};

// Virtual for full video info
generatedVideoSchema.virtual('videoInfo').get(function() {
  return {
    id: this._id,
    generationType: this.generationType,
    prompt: this.prompt.original,
    status: this.status,
    progress: this.progress,
    video: this.video,
    thumbnail: this.thumbnail,
    creditCost: this.creditCost,
    creditDeducted: this.creditDeducted,
    isFavorite: this.isFavorite,
    viewCount: this.viewCount,
    shareCount: this.shareCount,
    createdAt: this.createdAt,
    timing: this.timing,
    config: this.config
  };
});

// Ensure virtual fields are serialized
generatedVideoSchema.set('toJSON', { virtuals: true });

// Indexes for better query performance
generatedVideoSchema.index({ userId: 1, createdAt: -1 });
generatedVideoSchema.index({ userId: 1, status: 1 });
generatedVideoSchema.index({ userId: 1, isFavorite: 1 });
generatedVideoSchema.index({ status: 1, createdAt: 1 });
generatedVideoSchema.index({ externalJobId: 1 });
generatedVideoSchema.index({ creditDeducted: 1 });

module.exports = mongoose.model('GeneratedVideo', generatedVideoSchema);