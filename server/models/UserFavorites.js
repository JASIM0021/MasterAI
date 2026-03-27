const mongoose = require('mongoose');

const userFavoritesSchema = new mongoose.Schema({
  // User who owns the favorites
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Template favorites
  templates: [{
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoTemplate',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date,
      default: null
    }
  }],

  // Recently used templates (for quick access)
  recentTemplates: [{
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoTemplate',
      required: true
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    usageCount: {
      type: Number,
      default: 1
    }
  }],

  // User preferences for video generation
  preferences: {
    defaultAspectRatio: {
      type: String,
      enum: ['16:9', '9:16', '1:1'],
      default: '16:9'
    },
    defaultQuality: {
      type: String,
      enum: ['standard', 'high'],
      default: 'standard'
    },
    defaultCategory: {
      type: String,
      enum: [
        'marketing',
        'business',
        'creative',
        'artistic',
        'social_media',
        'educational',
        'lifestyle',
        'entertainment'
      ],
      default: 'social_media'
    },
    enableNotifications: {
      type: Boolean,
      default: true
    },
    autoSaveFavorites: {
      type: Boolean,
      default: false // Auto-favorite frequently used templates
    }
  },

  // Statistics
  stats: {
    totalFavorites: {
      type: Number,
      default: 0
    },
    totalVideosGenerated: {
      type: Number,
      default: 0
    },
    mostUsedCategory: {
      type: String,
      default: null
    },
    totalCreditsSpent: {
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
userFavoritesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add template to favorites
userFavoritesSchema.methods.addFavorite = function(templateId) {
  // Check if already in favorites
  const existingIndex = this.templates.findIndex(
    fav => fav.templateId.toString() === templateId.toString()
  );

  if (existingIndex === -1) {
    this.templates.push({
      templateId: templateId,
      addedAt: new Date(),
      usageCount: 0,
      lastUsedAt: null
    });

    this.stats.totalFavorites = this.templates.length;
  }

  return this.save();
};

// Method to remove template from favorites
userFavoritesSchema.methods.removeFavorite = function(templateId) {
  this.templates = this.templates.filter(
    fav => fav.templateId.toString() !== templateId.toString()
  );

  this.stats.totalFavorites = this.templates.length;
  return this.save();
};

// Method to check if template is favorited
userFavoritesSchema.methods.isFavorite = function(templateId) {
  return this.templates.some(
    fav => fav.templateId.toString() === templateId.toString()
  );
};

// Method to add to recent templates
userFavoritesSchema.methods.addToRecent = function(templateId) {
  const maxRecent = 10; // Keep last 10 recent templates

  // Remove existing entry if present
  this.recentTemplates = this.recentTemplates.filter(
    recent => recent.templateId.toString() !== templateId.toString()
  );

  // Add to beginning
  this.recentTemplates.unshift({
    templateId: templateId,
    usedAt: new Date(),
    usageCount: 1
  });

  // Keep only the most recent
  if (this.recentTemplates.length > maxRecent) {
    this.recentTemplates = this.recentTemplates.slice(0, maxRecent);
  }

  // Update usage count if in favorites
  const favoriteIndex = this.templates.findIndex(
    fav => fav.templateId.toString() === templateId.toString()
  );

  if (favoriteIndex !== -1) {
    this.templates[favoriteIndex].usageCount += 1;
    this.templates[favoriteIndex].lastUsedAt = new Date();
  }

  return this.save();
};

// Method to increment video generation count
userFavoritesSchema.methods.incrementVideoGenerated = function(creditCost = 20) {
  this.stats.totalVideosGenerated += 1;
  this.stats.totalCreditsSpent += creditCost;
  return this.save();
};

// Method to update most used category
userFavoritesSchema.methods.updateMostUsedCategory = async function() {
  try {
    const VideoTemplate = require('./VideoTemplate');
    const GeneratedVideo = require('./GeneratedVideo');

    // Get user's generated videos with template info
    const userVideos = await GeneratedVideo.find({
      userId: this.userId,
      status: 'completed',
      templateId: { $ne: null }
    }).populate('templateId', 'category');

    // Count categories
    const categoryCount = {};
    userVideos.forEach(video => {
      if (video.templateId && video.templateId.category) {
        const category = video.templateId.category;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

    // Find most used category
    let mostUsedCategory = null;
    let maxCount = 0;

    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedCategory = category;
      }
    });

    this.stats.mostUsedCategory = mostUsedCategory;
    return this.save();
  } catch (error) {
    console.error('Error updating most used category:', error);
    return this;
  }
};

// Method to update user preferences
userFavoritesSchema.methods.updatePreferences = function(newPreferences) {
  this.preferences = {
    ...this.preferences,
    ...newPreferences
  };
  return this.save();
};

// Static method to find or create favorites for user
userFavoritesSchema.statics.findOrCreateForUser = async function(userId) {
  let favorites = await this.findOne({ userId });

  if (!favorites) {
    favorites = new this({
      userId: userId,
      templates: [],
      recentTemplates: [],
      preferences: {
        defaultAspectRatio: '16:9',
        defaultQuality: 'standard',
        defaultCategory: 'social_media',
        enableNotifications: true,
        autoSaveFavorites: false
      },
      stats: {
        totalFavorites: 0,
        totalVideosGenerated: 0,
        mostUsedCategory: null,
        totalCreditsSpent: 0
      }
    });

    await favorites.save();
  }

  return favorites;
};

// Static method to get user's favorite templates with full template data
userFavoritesSchema.statics.getUserFavoritesWithTemplates = async function(userId, options = {}) {
  const { limit = 20, sort = 'recent' } = options;

  const favorites = await this.findOne({ userId })
    .populate({
      path: 'templates.templateId',
      model: 'VideoTemplate',
      match: { isActive: true }
    });

  if (!favorites) {
    return [];
  }

  // Filter out null templateIds (deleted templates)
  let favoriteTemplates = favorites.templates.filter(
    fav => fav.templateId !== null
  );

  // Sort favorites
  switch (sort) {
    case 'recent':
      favoriteTemplates.sort((a, b) => new Date(b.lastUsedAt || b.addedAt) - new Date(a.lastUsedAt || a.addedAt));
      break;
    case 'most_used':
      favoriteTemplates.sort((a, b) => b.usageCount - a.usageCount);
      break;
    case 'alphabetical':
      favoriteTemplates.sort((a, b) => a.templateId.name.localeCompare(b.templateId.name));
      break;
    default:
      favoriteTemplates.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }

  return favoriteTemplates.slice(0, limit).map(fav => ({
    ...fav.templateId.toObject(),
    favoriteInfo: {
      addedAt: fav.addedAt,
      usageCount: fav.usageCount,
      lastUsedAt: fav.lastUsedAt
    }
  }));
};

// Static method to get user's recent templates
userFavoritesSchema.statics.getUserRecentTemplates = async function(userId, limit = 5) {
  const favorites = await this.findOne({ userId })
    .populate({
      path: 'recentTemplates.templateId',
      model: 'VideoTemplate',
      match: { isActive: true }
    });

  if (!favorites) {
    return [];
  }

  return favorites.recentTemplates
    .filter(recent => recent.templateId !== null)
    .slice(0, limit)
    .map(recent => ({
      ...recent.templateId.toObject(),
      recentInfo: {
        usedAt: recent.usedAt,
        usageCount: recent.usageCount
      }
    }));
};

// Virtual for user stats
userFavoritesSchema.virtual('userStats').get(function() {
  return {
    totalFavorites: this.stats.totalFavorites,
    totalVideosGenerated: this.stats.totalVideosGenerated,
    mostUsedCategory: this.stats.mostUsedCategory,
    totalCreditsSpent: this.stats.totalCreditsSpent,
    averageCreditsPerVideo: this.stats.totalVideosGenerated > 0
      ? Math.round(this.stats.totalCreditsSpent / this.stats.totalVideosGenerated)
      : 0
  };
});

// Ensure virtual fields are serialized
userFavoritesSchema.set('toJSON', { virtuals: true });

// Indexes for better query performance
userFavoritesSchema.index({ userId: 1 });
userFavoritesSchema.index({ 'templates.templateId': 1 });
userFavoritesSchema.index({ 'recentTemplates.templateId': 1 });
userFavoritesSchema.index({ 'templates.addedAt': -1 });
userFavoritesSchema.index({ 'recentTemplates.usedAt': -1 });

module.exports = mongoose.model('UserFavorites', userFavoritesSchema);