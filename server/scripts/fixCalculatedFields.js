require('dotenv').config();
const mongoose = require('mongoose');
const CreditPackage = require('../models/CreditPackage');

async function fixCalculatedFields() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('🔧 Fixing calculated fields for credit packages...\n');

    const packages = await CreditPackage.find({});

    for (const pkg of packages) {
      // Manually calculate the fields
      pkg.totalCredits = pkg.credits + pkg.bonusCredits;
      pkg.pricePerCredit = parseFloat((pkg.price / pkg.credits).toFixed(2));

      // Save will trigger the pre-save hook, but we've already calculated
      await pkg.save();

      console.log(`✅ Fixed: ${pkg.name}`);
      console.log(`   Total Credits: ${pkg.totalCredits}`);
      console.log(`   Price per Credit: ₹${pkg.pricePerCredit}\n`);
    }

    await mongoose.connection.close();
    console.log('✅ All calculated fields fixed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCalculatedFields();