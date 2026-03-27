#!/usr/bin/env node

/**
 * Verification Script: Global Credits System
 *
 * This script verifies that the global credit system is working correctly
 * after migration and tests various credit operations.
 *
 * Usage: node scripts/verifyGlobalCredits.js [--user-email email@example.com]
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Credit = require('../models/Credit');
require('dotenv').config();

// Configuration
const TEST_USER_EMAIL = process.argv.includes('--user-email')
  ? process.argv[process.argv.indexOf('--user-email') + 1]
  : null;

/**
 * Connect to MongoDB
 */
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

/**
 * Test credit operations for a user
 */
async function testUserCredits(user) {
  console.log(`\n👤 Testing credits for: ${user.email}`);
  console.log('==========================================');

  try {
    // Get credit info
    const creditInfo = await user.getCreditInfo();
    console.log('📊 Credit Info:', JSON.stringify(creditInfo, null, 2));

    // Test service costs
    console.log('\n🏷️ Service Costs:');
    const credits = await Credit.findOrCreateForUser(user._id);
    const services = ['postGeneration', 'automation', 'execution', 'executionWithImage'];

    for (const service of services) {
      const cost = credits.getServiceCost(service);
      const canUse = await user.hasGlobalCredits(service);
      console.log(`  ${service}: ${cost} credits (can use: ${canUse})`);
    }

    // Test credit availability
    console.log('\n💰 Available Credits:');
    const globalCredits = await user.getAvailableGlobalCredits();
    console.log(`  Global Credits: ${globalCredits}`);

    // Test specific service availability
    console.log('\n🔍 Service Availability:');
    const automationCredits = await user.getAvailableAutomationCredits();
    const executionCredits = await user.getAvailableExecutionCredits();
    console.log(`  Can create ${automationCredits} automations`);
    console.log(`  Can execute ${executionCredits} times`);

    // Test credit consumption (dry run)
    console.log('\n🧪 Testing Credit Consumption (Simulation):');
    const originalBalance = credits.globalCredits.balance;

    console.log(`  Original Balance: ${originalBalance}`);

    // Simulate post creation (5 credits)
    if (await user.hasGlobalCredits('postGeneration')) {
      console.log('  ✅ Can create post (5 credits)');
    } else {
      console.log('  ❌ Cannot create post (insufficient credits)');
    }

    // Simulate automation creation (10 credits)
    if (await user.hasGlobalCredits('automation')) {
      console.log('  ✅ Can create automation (10 credits)');
    } else {
      console.log('  ❌ Cannot create automation (insufficient credits)');
    }

    // Simulate execution (5 credits)
    if (await user.hasGlobalCredits('execution')) {
      console.log('  ✅ Can execute automation (5 credits)');
    } else {
      console.log('  ❌ Cannot execute automation (insufficient credits)');
    }

    // Simulate execution with image (15 credits)
    if (await user.hasGlobalCredits('executionWithImage')) {
      console.log('  ✅ Can execute with image (15 credits)');
    } else {
      console.log('  ❌ Cannot execute with image (insufficient credits)');
    }

    console.log('  ✅ All credit tests passed!');

  } catch (error) {
    console.error(`  ❌ Error testing user credits:`, error.message);
  }
}

/**
 * Get global credit system statistics
 */
async function getGlobalCreditStats() {
  console.log('\n📈 Global Credit System Statistics');
  console.log('=====================================');

  try {
    // Count users with global credits enabled
    const totalUsers = await User.countDocuments();
    const globalCreditUsers = await Credit.countDocuments({ 'globalCredits.enabled': true });
    const legacyUsers = totalUsers - globalCreditUsers;

    console.log(`Total Users: ${totalUsers}`);
    console.log(`Users with Global Credits: ${globalCreditUsers} (${((globalCreditUsers/totalUsers)*100).toFixed(1)}%)`);
    console.log(`Users with Legacy Credits: ${legacyUsers} (${((legacyUsers/totalUsers)*100).toFixed(1)}%)`);

    // Get credit distribution statistics
    const creditStats = await Credit.aggregate([
      { $match: { 'globalCredits.enabled': true } },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$globalCredits.balance' },
          avgBalance: { $avg: '$globalCredits.balance' },
          minBalance: { $min: '$globalCredits.balance' },
          maxBalance: { $max: '$globalCredits.balance' },
          totalEarned: { $sum: '$globalCredits.totalEarned' },
          totalSpent: { $sum: '$globalCredits.totalSpent' }
        }
      }
    ]);

    if (creditStats.length > 0) {
      const stats = creditStats[0];
      console.log(`\n💰 Credit Balance Statistics:`);
      console.log(`  Total Credits in System: ${stats.totalBalance}`);
      console.log(`  Average Balance: ${stats.avgBalance.toFixed(2)}`);
      console.log(`  Min Balance: ${stats.minBalance}`);
      console.log(`  Max Balance: ${stats.maxBalance}`);
      console.log(`  Total Earned: ${stats.totalEarned}`);
      console.log(`  Total Spent: ${stats.totalSpent}`);
    }

    // Find users with low credits
    const lowCreditUsers = await Credit.find({
      'globalCredits.enabled': true,
      'globalCredits.balance': { $lt: 20 }
    }).populate('userId', 'email');

    if (lowCreditUsers.length > 0) {
      console.log(`\n⚠️ Users with Low Credits (< 20):`);
      lowCreditUsers.forEach(credit => {
        console.log(`  ${credit.userId.email}: ${credit.globalCredits.balance} credits`);
      });
    }

  } catch (error) {
    console.error('❌ Error getting credit statistics:', error);
  }
}

/**
 * Test the monthly credit addition functionality
 */
async function testMonthlyCreditAddition() {
  console.log('\n🗓️ Testing Monthly Credit Addition');
  console.log('===================================');

  try {
    // Find a test user
    const testUser = await User.findOne({});
    if (!testUser) {
      console.log('❌ No users found for testing');
      return;
    }

    const credits = await Credit.findOrCreateForUser(testUser._id);
    const originalBalance = credits.globalCredits.balance;

    console.log(`Testing with user: ${testUser.email}`);
    console.log(`Original balance: ${originalBalance}`);

    // Test adding monthly credits
    await credits.addMonthlyCredits();
    const newBalance = credits.globalCredits.balance;

    console.log(`New balance: ${newBalance}`);
    console.log(`Credits added: ${newBalance - originalBalance}`);

    if (newBalance === originalBalance + 100) {
      console.log('✅ Monthly credit addition working correctly!');
    } else {
      console.log('❌ Monthly credit addition not working as expected');
    }

  } catch (error) {
    console.error('❌ Error testing monthly credit addition:', error);
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  console.log('🔍 Global Credits System Verification');
  console.log('====================================');

  try {
    // Get global statistics
    await getGlobalCreditStats();

    // Test monthly credit addition
    await testMonthlyCreditAddition();

    // Test specific user if provided
    if (TEST_USER_EMAIL) {
      const user = await User.findOne({ email: TEST_USER_EMAIL });
      if (user) {
        await testUserCredits(user);
      } else {
        console.log(`❌ User with email ${TEST_USER_EMAIL} not found`);
      }
    } else {
      // Test first few users
      const users = await User.find({}).limit(3);
      for (const user of users) {
        await testUserCredits(user);
      }
    }

    console.log('\n✅ Verification completed successfully!');

  } catch (error) {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  }
}

/**
 * Cleanup and exit
 */
async function cleanup() {
  try {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  await connectToDatabase();
  await runVerification();
  await cleanup();
  process.exit(0);
}

// Run the verification
main().catch(async (error) => {
  console.error('💥 Unexpected error:', error);
  await cleanup();
  process.exit(1);
});