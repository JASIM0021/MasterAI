const mongoose = require('mongoose');

const creditPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  // Number of credits in this package
  credits: {
    type: Number,
    required: true,
    min: 1
  },

  // Bonus credits (free credits added to the package)
  bonusCredits: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total credits user gets (credits + bonusCredits)
  totalCredits: {
    type: Number
  },

  // Package pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    required: true,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },

  // Original price (for showing discounts)
  originalPrice: {
    type: Number,
    default: null
  },

  // Price per credit (calculated field)
  pricePerCredit: {
    type: Number
  },

  // Package tier/category
  tier: {
    type: String,
    enum: ['starter', 'popular', 'premium', 'enterprise'],
    default: 'starter'
  },

  // Package features/highlights
  features: [{
    type: String,
    trim: true
  }],

  // Package display settings
  displaySettings: {
    color: {
      type: String,
      default: '#007bff'
    },

    icon: {
      type: String,
      default: 'credit-card'
    },

    badge: {
      text: String,
      color: String
    },

    // Show as recommended/popular
    isRecommended: {
      type: Boolean,
      default: false
    },

    // Display order/priority
    sortOrder: {
      type: Number,
      default: 0
    }
  },

  // Package availability
  isActive: {
    type: Boolean,
    default: true
  },

  // Limited time offer
  limitedOffer: {
    isLimited: {
      type: Boolean,
      default: false
    },

    startDate: {
      type: Date,
      default: null
    },

    endDate: {
      type: Date,
      default: null
    },

    offerText: {
      type: String,
      default: null
    }
  },

  // Purchase statistics
  stats: {
    totalPurchases: {
      type: Number,
      default: 0
    },

    totalRevenue: {
      type: Number,
      default: 0
    },

    lastPurchased: {
      type: Date,
      default: null
    }
  },

  // Target audience
  targetAudience: {
    type: String,
    enum: ['all', 'new_users', 'existing_users', 'premium_users'],
    default: 'all'
  },

  // Minimum user requirements
  requirements: {
    minAccountAge: {
      type: Number, // in days
      default: 0
    },

    minPreviousPurchases: {
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

// Calculate derived fields before saving
creditPackageSchema.pre('save', function(next) {
  // Calculate total credits
  this.totalCredits = this.credits + this.bonusCredits;

  // Calculate price per credit (based on base credits, not including bonus)
  this.pricePerCredit = parseFloat((this.price / this.credits).toFixed(2));

  // Update timestamp
  this.updatedAt = Date.now();

  next();
});

// Instance method to check if package is available for user
creditPackageSchema.methods.isAvailableForUser = function(user) {
  // Check if package is active
  if (!this.isActive) return false;

  // Check limited offer dates
  if (this.limitedOffer.isLimited) {
    const now = new Date();
    if (this.limitedOffer.startDate && now < this.limitedOffer.startDate) return false;
    if (this.limitedOffer.endDate && now > this.limitedOffer.endDate) return false;
  }

  // Check target audience
  if (this.targetAudience !== 'all') {
    const accountAge = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));

    switch (this.targetAudience) {
      case 'new_users':
        if (accountAge > 30) return false; // New users = account less than 30 days
        break;
      case 'existing_users':
        if (accountAge <= 30) return false; // Existing users = account more than 30 days
        break;
      case 'premium_users':
        if (user.subscription?.plan !== 'premium') return false;
        break;
    }
  }

  // Check minimum requirements (would need to be implemented with purchase history)
  // For now, we'll skip this check

  return true;
};

// Instance method to get discount percentage
creditPackageSchema.methods.getDiscountPercentage = function() {
  if (!this.originalPrice || this.originalPrice <= this.price) {
    return 0;
  }

  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
};

// Instance method to record a purchase
creditPackageSchema.methods.recordPurchase = async function(amount) {
  this.stats.totalPurchases += 1;
  this.stats.totalRevenue += amount;
  this.stats.lastPurchased = new Date();
  return this.save();
};

// Static method to get active packages for user
creditPackageSchema.statics.getAvailablePackages = async function(user = null) {
  const packages = await this.find({ isActive: true })
    .sort({ 'displaySettings.sortOrder': 1, price: 1 });

  if (!user) {
    return packages;
  }

  // Filter packages based on user eligibility
  return packages.filter(pkg => pkg.isAvailableForUser(user));
};

// Static method to get recommended package
creditPackageSchema.statics.getRecommendedPackage = async function() {
  return this.findOne({
    isActive: true,
    'displaySettings.isRecommended': true
  }).sort({ 'displaySettings.sortOrder': 1 });
};

// Static method to create default packages
creditPackageSchema.statics.createDefaultPackages = async function() {
  const defaultPackages = [
    {
      name: 'Starter Pack',
      description: 'Perfect for getting started with AI features',
      credits: 100,
      bonusCredits: 150,
      price: 99,
      originalPrice: 149,
      tier: 'starter',
      features: ['100 base credits', '150 bonus credits', 'All AI features access', '250 total credits'],
      displaySettings: {
        color: '#28a745',
        sortOrder: 1,
        badge: {
          text: 'NEW USER',
          color: '#17a2b8'
        }
      }
    },
    {
      name: 'Popular Pack',
      description: 'Most popular choice for regular users',
      credits: 500,
      bonusCredits: 200,
      price: 399,
      originalPrice: 549,
      tier: 'popular',
      features: ['500 base credits', '200 bonus credits', 'All AI features access', '700 total credits', 'Save ₹150'],
      displaySettings: {
        color: '#007bff',
        isRecommended: true,
        sortOrder: 2,
        badge: {
          text: 'POPULAR',
          color: '#ff6b35'
        }
      }
    },
    {
      name: 'Premium Pack',
      description: 'Great value for power users',
      credits: 1000,
      bonusCredits: 350,
      price: 699,
      originalPrice: 999,
      tier: 'premium',
      features: ['1000 base credits', '350 bonus credits', 'All AI features access', '1350 total credits', 'Save ₹300'],
      displaySettings: {
        color: '#6f42c1',
        sortOrder: 3,
        badge: {
          text: 'BEST VALUE',
          color: '#28a745'
        }
      }
    },
    {
      name: 'Enterprise Pack',
      description: 'Maximum value for heavy users',
      credits: 5000,
      bonusCredits: 2000,
      price: 2999,
      originalPrice: 4499,
      tier: 'enterprise',
      features: ['5000 base credits', '2000 bonus credits', 'All AI features access', '7000 total credits', 'Save ₹1500', 'Priority support'],
      displaySettings: {
        color: '#dc3545',
        sortOrder: 4,
        badge: {
          text: 'ENTERPRISE',
          color: '#6c757d'
        }
      }
    }
  ];

  const existingPackages = await this.countDocuments();
  if (existingPackages === 0) {
    return this.insertMany(defaultPackages);
  }

  return [];
};

// Indexes for better query performance
creditPackageSchema.index({ isActive: 1, 'displaySettings.sortOrder': 1 });
creditPackageSchema.index({ tier: 1 });
creditPackageSchema.index({ targetAudience: 1 });
creditPackageSchema.index({ 'limitedOffer.isLimited': 1, 'limitedOffer.endDate': 1 });

module.exports = mongoose.model('CreditPackage', creditPackageSchema);