const mongoose = require('mongoose');
const CreditPackage = require('../models/CreditPackage');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDefaultPackages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: 'masterAiApiKey',
    });
    console.log('✅ Connected to MongoDB');

    console.log('📦 Creating default credit packages...');
    const createdPackages = await CreditPackage.createDefaultPackages();

    if (createdPackages.length > 0) {
      console.log('✅ Default credit packages created successfully:');
      createdPackages.forEach(pkg => {
        console.log(`   - ${pkg.name}: ${pkg.totalCredits} credits for ₹${pkg.price}`);
      });
    } else {
      console.log('ℹ️  Default credit packages already exist');
    }

    console.log('🎉 Initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing packages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the initialization
initializeDefaultPackages();