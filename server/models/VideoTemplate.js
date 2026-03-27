const mongoose = require('mongoose');

const videoTemplateSchema = new mongoose.Schema({
  // Template identification
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: [
      'marketing',
      'business',
      'creative',
      'artistic',
      'social_media',
      'educational',
      'lifestyle',
      'entertainment'
    ]
  },

  // Template content and AI configuration
  prompt: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],

  // Visual presentation
  thumbnail: {
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    }
  },

  // Placeholder/demo video (before actual generation)
  dummyVideo: {
    url: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // Duration in seconds
      default: 8
    },
    aspectRatio: {
      type: String,
      enum: ['16:9', '9:16', '1:1'],
      default: '16:9'
    }
  },

  // Template configuration
  config: {
    // Video generation parameters
    duration: {
      type: Number,
      default: 8, // Veo3 supports max 8 seconds
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
    // AI model specific settings
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

  // User photo integration settings
  supportsUserPhoto: {
    type: Boolean,
    default: false
  },
  photoPromptTemplate: {
    type: String,
    default: '' // Template for incorporating user photos into the prompt
  },

  // Template metadata
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedTime: {
    type: Number, // Generation time in seconds
    default: 30
  },

  // Usage statistics
  usageCount: {
    type: Number,
    default: 0
  },

  // Template status and availability
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },

  // Administrative info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for system-created templates
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
videoTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get templates by category
videoTemplateSchema.statics.getByCategory = function(category) {
  return this.find({
    category: category,
    isActive: true
  }).sort({ sortOrder: 1, usageCount: -1 });
};

// Static method to get popular templates
videoTemplateSchema.statics.getPopular = function(limit = 10) {
  return this.find({
    isActive: true
  }).sort({ usageCount: -1 }).limit(limit);
};

// Static method to search templates
videoTemplateSchema.statics.searchTemplates = function(query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    isActive: true,
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ]
  }).sort({ usageCount: -1 });
};

// Method to increment usage count
videoTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Method to get template with user photo integration
videoTemplateSchema.methods.getPromptWithPhoto = function(photoDescription = '') {
  if (!this.supportsUserPhoto || !this.photoPromptTemplate) {
    return this.prompt;
  }

  return this.photoPromptTemplate
    .replace('{ORIGINAL_PROMPT}', this.prompt)
    .replace('{USER_PHOTO}', photoDescription || 'user provided image');
};

// Virtual for full template info (includes computed fields)
videoTemplateSchema.virtual('templateInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    category: this.category,
    prompt: this.prompt,
    tags: this.tags,
    thumbnail: this.thumbnail,
    dummyVideo: this.dummyVideo,
    config: this.config,
    supportsUserPhoto: this.supportsUserPhoto,
    difficulty: this.difficulty,
    estimatedTime: this.estimatedTime,
    usageCount: this.usageCount,
    isPremium: this.isPremium,
    isActive: this.isActive
  };
});

// Ensure virtual fields are serialized
videoTemplateSchema.set('toJSON', { virtuals: true });

// Indexes for better query performance
videoTemplateSchema.index({ category: 1, isActive: 1 });
videoTemplateSchema.index({ usageCount: -1 });
videoTemplateSchema.index({ isActive: 1, sortOrder: 1 });
videoTemplateSchema.index({ tags: 1 });
videoTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('VideoTemplate', videoTemplateSchema);