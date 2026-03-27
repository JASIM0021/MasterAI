const fs = require('fs').promises;
const path = require('path');

class JsonTemplateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../data/videoTemplates.json');
    this.templates = null;
    this.categories = null;
  }

  async loadTemplates() {
    try {
      if (this.templates) {
        return { templates: this.templates, categories: this.categories };
      }

      const data = await fs.readFile(this.templatesPath, 'utf8');
      const parsed = JSON.parse(data);

      this.templates = parsed.templates;
      this.categories = parsed.categories;

      console.log(`📚 Loaded ${this.templates.length} templates and ${this.categories.length} categories from JSON`);
      return { templates: this.templates, categories: this.categories };
    } catch (error) {
      console.error('❌ Failed to load templates from JSON:', error);
      // Return empty arrays as fallback
      return { templates: [], categories: [] };
    }
  }

  async getTemplates(options = {}) {
    const { templates } = await this.loadTemplates();
    const {
      search = '',
      category = null,
      sort = 'popular', // popular, newest, alphabetical, trending
      limit = 20,
      skip = 0,
      supportsPhoto = null
    } = options;

    let filteredTemplates = [...templates];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by category
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(template =>
        template.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by photo support
    if (supportsPhoto !== null) {
      filteredTemplates = filteredTemplates.filter(template =>
        template.supportsUserPhoto === supportsPhoto
      );
    }

    // Sort templates
    switch (sort) {
      case 'popular':
        filteredTemplates.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'newest':
        filteredTemplates.sort((a, b) => {
          if (a.isNew && !b.isNew) return -1;
          if (!a.isNew && b.isNew) return 1;
          return b.usageCount - a.usageCount; // fallback to popularity
        });
        break;
      case 'trending':
        filteredTemplates.sort((a, b) => {
          if (a.isTrending && !b.isTrending) return -1;
          if (!a.isTrending && b.isTrending) return 1;
          return b.usageCount - a.usageCount; // fallback to popularity
        });
        break;
      case 'alphabetical':
        filteredTemplates.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'favorites':
        filteredTemplates.sort((a, b) => b.favoriteCount - a.favoriteCount);
        break;
      default:
        filteredTemplates.sort((a, b) => b.usageCount - a.usageCount);
    }

    // Apply pagination
    const paginatedTemplates = filteredTemplates.slice(skip, skip + limit);

    return {
      templates: paginatedTemplates,
      total: filteredTemplates.length,
      hasMore: skip + limit < filteredTemplates.length,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(filteredTemplates.length / limit)
    };
  }

  async getTemplateById(templateId) {
    const { templates } = await this.loadTemplates();
    return templates.find(template => template.id === templateId);
  }

  async getCategories() {
    const { categories } = await this.loadTemplates();

    // Add template count for each category
    const { templates } = await this.loadTemplates();
    const categoriesWithCount = categories.map(category => ({
      ...category,
      templateCount: templates.filter(template =>
        template.category.toLowerCase() === category.name.toLowerCase()
      ).length
    }));

    return categoriesWithCount;
  }

  async getRecentTemplates(limit = 3) {
    const { templates } = await this.loadTemplates();

    // Get recently used templates (simulate with highest usage + some randomness)
    const recentTemplates = templates
      .filter(template => template.usageCount > 1000)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);

    return recentTemplates;
  }

  async getTrendingTemplates(limit = 6) {
    const { templates } = await this.loadTemplates();

    const trendingTemplates = templates
      .filter(template => template.isTrending)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);

    return trendingTemplates;
  }

  async incrementUsage(templateId) {
    // In a real app, this would update the database
    // For JSON templates, we'll just log the usage
    console.log(`📈 Template ${templateId} usage incremented (JSON mode - not persisted)`);
    return true;
  }

  async toggleFavorite(templateId, userId) {
    // In a real app, this would update user favorites in database
    // For JSON templates, we'll simulate the response
    console.log(`❤️ Template ${templateId} favorite toggled for user ${userId} (JSON mode - not persisted)`);
    return { isFavorite: true }; // Simulate adding to favorites
  }

  // Helper method to get template prompt with user photo integration
  getProcessedPrompt(template, userPhoto = null) {
    if (!userPhoto || !template.supportsUserPhoto) {
      return template.prompt.replace('{USER_PHOTO}', 'a person');
    }

    // Use photoPromptTemplate if available, otherwise fallback to regular prompt
    const promptTemplate = template.photoPromptTemplate || template.prompt;
    return promptTemplate.replace('{USER_PHOTO}', 'the uploaded user photo');
  }
}

module.exports = new JsonTemplateService();