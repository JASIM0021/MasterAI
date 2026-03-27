require('dotenv').config();
const mongoose = require('mongoose');
const CreditPackage = require('../models/CreditPackage');

// Database connection
const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/masterai';
    const conn = await mongoose.connect(mongoUrl);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// New credit packages with enhanced pricing structure
const newCreditPackages = [
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

async function updateCreditPackages() {
  try {
    console.log('🚀 Starting credit package update...');

    // Connect to database
    await connectDB();

    // Remove all existing packages
    const deletedCount = await CreditPackage.deleteMany({});
    console.log(`📦 Removed ${deletedCount.deletedCount} existing packages`);

    // Insert new packages
    const insertedPackages = await CreditPackage.insertMany(newCreditPackages);
    console.log(`✅ Inserted ${insertedPackages.length} new packages`);

    // Display the new packages
    console.log('\n📋 New Credit Packages:');
    console.log('====================================');

    for (const pkg of insertedPackages) {
      const discount = pkg.getDiscountPercentage();
      console.log(`
🏷️  ${pkg.name} (${pkg.tier.toUpperCase()})
   💰 Price: ₹${pkg.price} ${pkg.originalPrice ? `(was ₹${pkg.originalPrice})` : ''}
   🎯 Credits: ${pkg.credits} + ${pkg.bonusCredits} bonus = ${pkg.totalCredits} total
   💳 Price per credit: ₹${pkg.pricePerCredit}
   ${discount > 0 ? `💸 Discount: ${discount}%` : ''}
   🎨 Color: ${pkg.displaySettings.color}
   ${pkg.displaySettings.badge ? `🏆 Badge: ${pkg.displaySettings.badge.text}` : ''}
   ${pkg.displaySettings.isRecommended ? '⭐ RECOMMENDED' : ''}
      `);
    }

    console.log('✅ Credit package update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating credit packages:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the update
if (require.main === module) {
  updateCreditPackages();
}

module.exports = { updateCreditPackages, newCreditPackages };