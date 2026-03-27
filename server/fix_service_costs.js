#!/usr/bin/env node

/**
 * Fix Service Costs for Existing Users
 *
 * Updates existing Credit records with correct service costs
 */

const mongoose = require('mongoose');
const Credit = require('./models/Credit');
require('dotenv').config();

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: 'masterAiApiKey',
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function fixServiceCosts() {
  console.log('🔧 Fixing Service Costs for All Users');
  console.log('=====================================');

  try {
    // Correct service costs
    const correctServiceCosts = {
      postGeneration: 5,
      captionGeneration: 5,
      automation: 10,
      execution: 5,
      executionWithImage: 15
    };

    // Update all Credit records
    const result = await Credit.updateMany(
      {}, // Update all records
      {
        $set: {
          serviceCosts: correctServiceCosts,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} credit records with correct service costs`);
    console.log('📋 Service Costs:');
    Object.entries(correctServiceCosts).forEach(([service, cost]) => {
      console.log(`   ${service}: ${cost} credits`);
    });

    // Verify the fix
    const credits = await Credit.find({ 'globalCredits.enabled': true });
    console.log(`\n🔍 Verification: Found ${credits.length} users with global credits`);

    if (credits.length > 0) {
      const firstUser = credits[0];
      console.log('📊 Sample user service costs:');
      Object.entries(firstUser.serviceCosts).forEach(([service, cost]) => {
        console.log(`   ${service}: ${cost} credits`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing service costs:', error);
  }
}

async function main() {
  await connectToDatabase();
  await fixServiceCosts();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
  console.log('✅ Service costs fixed successfully!');
}

main().catch(console.error);