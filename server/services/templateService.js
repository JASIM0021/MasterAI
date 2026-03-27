const VideoTemplate = require('../models/VideoTemplate');
const UserFavorites = require('../models/UserFavorites');
const GeneratedVideo = require('../models/GeneratedVideo');

/**
 * Template Service
 * Handles CRUD operations and business logic for video templates
 */
class TemplateService {
  constructor() {
    this.defaultTemplatesCreated = false;
  }

  /**
   * Get all active templates with user-specific data
   * @param {string} userId - User ID for favorites info
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Templates with user data
   */
  async getTemplates(userId = null, options = {}) {
    try {
      const {
        category = null,
        search = null,
        sortBy = 'popular', // popular, newest, alphabetical
        limit = 50,
        skip = 0
      } = options;

      console.log(`📋 Getting templates for user ${userId || 'anonymous'}`);

      // Build query
      const query = { isActive: true };

      if (category) {
        query.category = category;
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } }
        ];
      }

      // Build sort
      let sort = {};
      switch (sortBy) {
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'alphabetical':
          sort = { name: 1 };
          break;
        case 'popular':
        default:
          sort = { usageCount: -1, sortOrder: 1 };
          break;
      }

      // Get templates
      const templates = await VideoTemplate.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();

      // Add user-specific data if userId provided
      if (userId) {
        const userFavorites = await UserFavorites.findOne({ userId });
        const favoriteIds = userFavorites
          ? userFavorites.templates.map(fav => fav.templateId.toString())
          : [];

        // Add isFavorite flag to each template
        templates.forEach(template => {
          template.isFavorite = favoriteIds.includes(template._id.toString());
        });
      }

      console.log(`✅ Retrieved ${templates.length} templates`);
      return templates;

    } catch (error) {
      console.error('❌ Failed to get templates:', error);
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }

  /**
   * Get template by ID with user-specific data
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID for favorites info
   * @returns {Promise<Object>} Template with user data
   */
  async getTemplate(templateId, userId = null) {
    try {
      console.log(`🔍 Getting template ${templateId} for user ${userId || 'anonymous'}`);

      const template = await VideoTemplate.findById(templateId).lean();

      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.isActive) {
        throw new Error('Template is not available');
      }

      // Add user-specific data if userId provided
      if (userId) {
        const userFavorites = await UserFavorites.findOne({ userId });
        template.isFavorite = userFavorites
          ? userFavorites.isFavorite(templateId)
          : false;
      }

      console.log(`✅ Retrieved template: ${template.name}`);
      return template;

    } catch (error) {
      console.error('❌ Failed to get template:', error);
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @param {string} userId - User ID for favorites info
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Templates in category
   */
  async getTemplatesByCategory(category, userId = null, options = {}) {
    return this.getTemplates(userId, { ...options, category });
  }

  /**
   * Search templates
   * @param {string} query - Search query
   * @param {string} userId - User ID for favorites info
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching templates
   */
  async searchTemplates(query, userId = null, options = {}) {
    return this.getTemplates(userId, { ...options, search: query });
  }

  /**
   * Get popular templates
   * @param {string} userId - User ID for favorites info
   * @param {number} limit - Number of templates to return
   * @returns {Promise<Array>} Popular templates
   */
  async getPopularTemplates(userId = null, limit = 10) {
    return this.getTemplates(userId, { sortBy: 'popular', limit });
  }

  /**
   * Get user's favorite templates
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Favorite templates
   */
  async getUserFavorites(userId, options = {}) {
    try {
      console.log(`💖 Getting favorite templates for user ${userId}`);

      const favoriteTemplates = await UserFavorites.getUserFavoritesWithTemplates(userId, options);

      console.log(`✅ Retrieved ${favoriteTemplates.length} favorite templates`);
      return favoriteTemplates;

    } catch (error) {
      console.error('❌ Failed to get user favorites:', error);
      throw new Error(`Failed to get user favorites: ${error.message}`);
    }
  }

  /**
   * Get user's recent templates
   * @param {string} userId - User ID
   * @param {number} limit - Number of templates to return
   * @returns {Promise<Array>} Recent templates
   */
  async getUserRecentTemplates(userId, limit = 5) {
    try {
      console.log(`🕐 Getting recent templates for user ${userId}`);

      const recentTemplates = await UserFavorites.getUserRecentTemplates(userId, limit);

      console.log(`✅ Retrieved ${recentTemplates.length} recent templates`);
      return recentTemplates;

    } catch (error) {
      console.error('❌ Failed to get user recent templates:', error);
      throw new Error(`Failed to get user recent templates: ${error.message}`);
    }
  }

  /**
   * Add template to user favorites
   * @param {string} userId - User ID
   * @param {string} templateId - Template ID to favorite
   * @returns {Promise<boolean>} Success status
   */
  async addToFavorites(userId, templateId) {
    try {
      console.log(`💖 Adding template ${templateId} to favorites for user ${userId}`);

      // Verify template exists and is active
      const template = await VideoTemplate.findById(templateId);
      if (!template || !template.isActive) {
        throw new Error('Template not found or not available');
      }

      // Get or create user favorites
      const userFavorites = await UserFavorites.findOrCreateForUser(userId);

      // Add to favorites
      await userFavorites.addFavorite(templateId);

      console.log('✅ Template added to favorites successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to add template to favorites:', error);
      throw new Error(`Failed to add template to favorites: ${error.message}`);
    }
  }

  /**
   * Remove template from user favorites
   * @param {string} userId - User ID
   * @param {string} templateId - Template ID to unfavorite
   * @returns {Promise<boolean>} Success status
   */
  async removeFromFavorites(userId, templateId) {
    try {
      console.log(`💔 Removing template ${templateId} from favorites for user ${userId}`);

      // Get user favorites
      const userFavorites = await UserFavorites.findOne({ userId });

      if (!userFavorites) {
        throw new Error('User favorites not found');
      }

      // Remove from favorites
      await userFavorites.removeFavorite(templateId);

      console.log('✅ Template removed from favorites successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to remove template from favorites:', error);
      throw new Error(`Failed to remove template from favorites: ${error.message}`);
    }
  }

  /**
   * Toggle template favorite status
   * @param {string} userId - User ID
   * @param {string} templateId - Template ID to toggle
   * @returns {Promise<Object>} New favorite status
   */
  async toggleFavorite(userId, templateId) {
    try {
      console.log(`🔄 Toggling favorite status for template ${templateId} and user ${userId}`);

      // Get or create user favorites
      const userFavorites = await UserFavorites.findOrCreateForUser(userId);

      const isFavorite = userFavorites.isFavorite(templateId);

      if (isFavorite) {
        await userFavorites.removeFavorite(templateId);
      } else {
        await userFavorites.addFavorite(templateId);
      }

      const newStatus = !isFavorite;

      console.log(`✅ Template favorite status toggled to: ${newStatus}`);

      return {
        templateId,
        isFavorite: newStatus,
        action: newStatus ? 'added' : 'removed'
      };

    } catch (error) {
      console.error('❌ Failed to toggle template favorite:', error);
      throw new Error(`Failed to toggle template favorite: ${error.message}`);
    }
  }

  /**
   * Record template usage
   * @param {string} templateId - Template ID used
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async recordTemplateUsage(templateId, userId) {
    try {
      console.log(`📊 Recording usage for template ${templateId} by user ${userId}`);

      // Increment template usage count
      const template = await VideoTemplate.findById(templateId);
      if (template) {
        await template.incrementUsage();
      }

      // Add to user's recent templates
      const userFavorites = await UserFavorites.findOrCreateForUser(userId);
      await userFavorites.addToRecent(templateId);

      console.log('✅ Template usage recorded successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to record template usage:', error);
      throw new Error(`Failed to record template usage: ${error.message}`);
    }
  }

  /**
   * Get template categories with counts
   * @param {string} userId - User ID for favorites info
   * @returns {Promise<Array>} Categories with template counts
   */
  async getCategories(userId = null) {
    try {
      console.log('📂 Getting template categories');

      const pipeline = [
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ];

      const categories = await VideoTemplate.aggregate(pipeline);

      // Add display names and other info
      const categoryInfo = {
        marketing: { name: 'Marketing & Business', icon: '📈' },
        business: { name: 'Business', icon: '💼' },
        creative: { name: 'Creative & Artistic', icon: '🎨' },
        artistic: { name: 'Artistic', icon: '🖼️' },
        social_media: { name: 'Social Media', icon: '📱' },
        educational: { name: 'Educational', icon: '📚' },
        lifestyle: { name: 'Lifestyle', icon: '🌟' },
        entertainment: { name: 'Entertainment', icon: '🎭' }
      };

      const result = categories.map(cat => ({
        id: cat._id,
        name: categoryInfo[cat._id]?.name || cat._id,
        icon: categoryInfo[cat._id]?.icon || '📁',
        count: cat.count
      }));

      console.log(`✅ Retrieved ${result.length} categories`);
      return result;

    } catch (error) {
      console.error('❌ Failed to get categories:', error);
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  /**
   * Get template statistics
   * @returns {Promise<Object>} Template statistics
   */
  async getTemplateStats() {
    try {
      console.log('📊 Getting template statistics');

      const stats = await VideoTemplate.aggregate([
        {
          $group: {
            _id: null,
            totalTemplates: { $sum: 1 },
            activeTemplates: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            totalUsage: { $sum: '$usageCount' },
            averageUsage: { $avg: '$usageCount' }
          }
        }
      ]);

      const categoryStats = await VideoTemplate.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, usage: { $sum: '$usageCount' } } },
        { $sort: { usage: -1 } }
      ]);

      const result = {
        total: stats[0]?.totalTemplates || 0,
        active: stats[0]?.activeTemplates || 0,
        totalUsage: stats[0]?.totalUsage || 0,
        averageUsage: Math.round(stats[0]?.averageUsage || 0),
        categories: categoryStats
      };

      console.log('✅ Retrieved template statistics');
      return result;

    } catch (error) {
      console.error('❌ Failed to get template statistics:', error);
      throw new Error(`Failed to get template statistics: ${error.message}`);
    }
  }

  /**
   * Create a new template (admin function)
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData) {
    try {
      console.log('➕ Creating new template');

      const template = new VideoTemplate(templateData);
      await template.save();

      console.log(`✅ Template created: ${template.name}`);
      return template;

    } catch (error) {
      console.error('❌ Failed to create template:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Update template (admin function)
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(templateId, updateData) {
    try {
      console.log(`📝 Updating template ${templateId}`);

      const template = await VideoTemplate.findByIdAndUpdate(
        templateId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!template) {
        throw new Error('Template not found');
      }

      console.log(`✅ Template updated: ${template.name}`);
      return template;

    } catch (error) {
      console.error('❌ Failed to update template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete template (admin function - soft delete)
   * @param {string} templateId - Template ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTemplate(templateId) {
    try {
      console.log(`🗑️ Deleting template ${templateId}`);

      // Soft delete by setting isActive to false
      const template = await VideoTemplate.findByIdAndUpdate(
        templateId,
        { isActive: false },
        { new: true }
      );

      if (!template) {
        throw new Error('Template not found');
      }

      console.log(`✅ Template deleted: ${template.name}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Initialize default templates if they don't exist
   * @returns {Promise<boolean>} Success status
   */
  async initializeDefaultTemplates() {
    try {
      if (this.defaultTemplatesCreated) {
        return true;
      }

      console.log('🏗️ Checking for default templates...');

      const existingCount = await VideoTemplate.countDocuments();

      if (existingCount === 0) {
        console.log('📋 Creating default templates...');
        await this.createDefaultTemplates();
        this.defaultTemplatesCreated = true;
        console.log('✅ Default templates created successfully');
      } else {
        console.log(`✅ Found ${existingCount} existing templates`);
        this.defaultTemplatesCreated = true;
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to initialize default templates:', error);
      throw new Error(`Failed to initialize default templates: ${error.message}`);
    }
  }

  /**
   * Create default template set
   * @returns {Promise<Array>} Created templates
   */
  async createDefaultTemplates() {
    // This will be implemented when we create the template data
    console.log('🔄 Default template creation will be implemented with template data');
    return [];
  }
}

// Create and export singleton instance
const templateService = new TemplateService();

module.exports = {
  templateService,
  TemplateService
};