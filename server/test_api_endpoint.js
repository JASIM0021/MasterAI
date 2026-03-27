#!/usr/bin/env node

/**
 * Test API Endpoint for Global Credits
 *
 * Tests the /payments/credits/balance endpoint that frontend uses
 */

const mongoose = require('mongoose');
const User = require('./models/User');
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

async function testAPIEndpoint() {
  console.log('🧪 Testing API Endpoint: /payments/credits/balance');
  console.log('====================================================');

  try {
    // Get the user
    const user = await User.findOne({});
    if (!user) {
      console.log('❌ No users found');
      return;
    }

    console.log(`👤 Testing with user: ${user.email}`);

    // Get credit record
    const credits = await Credit.findOrCreateForUser(user._id);

    // Test the method that the API endpoint calls
    const unifiedStatus = credits.getUnifiedCreditStatus();

    console.log('\n📋 API Response (getUnifiedCreditStatus):');
    console.log(JSON.stringify(unifiedStatus, null, 2));

    // Verify the structure
    if (unifiedStatus.type === 'global') {
      console.log('\n✅ Global credit system detected');
      console.log(`💰 Balance: ${unifiedStatus.balance} credits`);
      console.log('🏷️ Service costs:');
      Object.entries(unifiedStatus.serviceCosts).forEach(([service, cost]) => {
        console.log(`   ${service}: ${cost} credits`);
      });
    } else {
      console.log('\n⚠️ Still using legacy credit system');
      console.log('📋 Legacy services:');
      Object.entries(unifiedStatus.services || {}).forEach(([service, data]) => {
        console.log(`   ${service}: ${data.remaining}/${data.total} remaining`);
      });
    }

    // Test global credit info method
    console.log('\n📊 Global Credit Info:');
    const globalCreditInfo = credits.getGlobalCreditInfo();
    console.log(JSON.stringify(globalCreditInfo, null, 2));

  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
  }
}

async function main() {
  await connectToDatabase();
  await testAPIEndpoint();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
}

main().catch(console.error);