require('dotenv').config();
const mongoose = require('mongoose');
const CreditPackage = require('../models/CreditPackage');

async function verifyCreditPackages() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('🔍 Verifying Credit Packages in Database...\n');

    const packages = await CreditPackage.find({}).sort({ 'displaySettings.sortOrder': 1 });

    console.log(`Found ${packages.length} packages:\n`);

    packages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   💰 Price: ₹${pkg.price} (original: ₹${pkg.originalPrice})`);
      console.log(`   🎯 Credits: ${pkg.credits} + ${pkg.bonusCredits} bonus = ${pkg.totalCredits} total`);
      console.log(`   💳 Price per credit: ₹${pkg.pricePerCredit}`);
      console.log(`   🏆 Tier: ${pkg.tier}`);
      console.log(`   🎨 Badge: ${pkg.displaySettings.badge?.text || 'None'}`);
      console.log(`   ⭐ Recommended: ${pkg.displaySettings.isRecommended ? 'Yes' : 'No'}`);
      console.log(`   ✅ Active: ${pkg.isActive ? 'Yes' : 'No'}\n`);
    });

    await mongoose.connection.close();
    console.log('✅ Verification completed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyCreditPackages();