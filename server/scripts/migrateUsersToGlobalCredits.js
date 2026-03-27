#!/usr/bin/env node

/**
 * Migration Script: Legacy Credits to Global Credits System
 *
 * This script migrates existing users from the legacy individual credit system
 * to the new unified global credit system.
 *
 * Usage: node scripts/migrateUsersToGlobalCredits.js [--dry-run]
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Credit = require('../models/Credit');
require('dotenv').config();

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_GLOBAL_CREDITS = 100; // Starting credits for all users

// Migration statistics
const stats = {
  totalUsers: 0,
  usersWithLegacyCredits: 0,
  usersAlreadyGlobal: 0,
  migratedUsers: 0,
  errors: 0,
  errorDetails: []
};

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
 * Calculate global credit equivalent from legacy credits
 */
function calculateGlobalCreditEquivalent(legacyCredits) {
  let totalValue = 0;

  // Legacy credit values (estimated based on usage)
  const creditValues = {
    postGeneration: 5,        // Each post generation = 5 global credits
    captionGeneration: 5,     // Each caption generation = 5 global credits
    aiImageEdit: 10,          // Each image edit = 10 global credits
    aiImageGeneration: 15,    // Each image generation = 15 global credits
    automation: 10,           // Each automation = 10 global credits
    execution: 5              // Each execution = 5 global credits
  };

  // Calculate total value from remaining legacy credits
  for (const [service, credit] of Object.entries(legacyCredits)) {
    if (credit && typeof credit === 'object' && credit.total && credit.used !== undefined) {
      const remaining = Math.max(0, credit.total - credit.used);
      const serviceValue = creditValues[service] || 5; // Default 5 credits
      totalValue += remaining * serviceValue;

      console.log(`  📊 ${service}: ${remaining} remaining × ${serviceValue} = ${remaining * serviceValue} global credits`);
    }
  }

  return Math.max(totalValue, DEFAULT_GLOBAL_CREDITS); // Ensure minimum credits
}

/**
 * Migrate a single user to global credits
 */
async function migrateUser(user) {
  try {
    console.log(`\n👤 Migrating user: ${user.email} (${user._id})`);

    // Check if user already has global credits enabled
    const existingCredits = await Credit.findOne({ userId: user._id });

    if (existingCredits && existingCredits.isGlobalCreditsEnabled()) {
      console.log(`  ⏭️ User already has global credits enabled. Balance: ${existingCredits.globalCredits.balance}`);
      stats.usersAlreadyGlobal++;
      return;
    }

    // Get or create credit record
    const credits = await Credit.findOrCreateForUser(user._id);

    // Calculate global credit equivalent from legacy system
    let globalCreditAmount = DEFAULT_GLOBAL_CREDITS;

    if (user.credits && Object.keys(user.credits).length > 0) {
      console.log('  🔄 Found legacy credits, calculating equivalent...');
      globalCreditAmount = calculateGlobalCreditEquivalent(user.credits);
      stats.usersWithLegacyCredits++;
    }

    if (!DRY_RUN) {
      // Enable global credits and set balance
      credits.globalCredits.enabled = true;
      credits.globalCredits.balance = globalCreditAmount;
      credits.globalCredits.totalEarned = globalCreditAmount;
      credits.globalCredits.totalSpent = 0;
      credits.globalCredits.enabledAt = new Date();
      credits.globalCredits.lastMonthlyAddition = new Date();

      // Clear legacy credits from user model if they exist
      if (user.credits) {
        user.credits = undefined;
        user.markModified('credits');
        await user.save();
        console.log('  🧹 Cleared legacy credits from user model');
      }

      // Save credit record
      credits.updatedAt = new Date();
      await credits.save();

      console.log(`  ✅ Migrated successfully! Global credits: ${globalCreditAmount}`);
      stats.migratedUsers++;
    } else {
      console.log(`  🔍 [DRY RUN] Would migrate user with ${globalCreditAmount} global credits`);
    }

  } catch (error) {
    console.error(`  ❌ Error migrating user ${user.email}:`, error.message);
    stats.errors++;
    stats.errorDetails.push({
      userId: user._id,
      email: user.email,
      error: error.message
    });
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Global Credits Migration');
  console.log('=====================================');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('📋 Migration Configuration:');
  console.log(`   Default Global Credits: ${DEFAULT_GLOBAL_CREDITS}`);
  console.log(`   Service Costs: post=5, automation=10, execution=5, executionWithImage=15`);

  try {
    // Get all users
    const users = await User.find({});
    stats.totalUsers = users.length;

    console.log(`\n📊 Found ${users.length} users to process`);

    // Process users in batches of 10 to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);

      // Process batch users in parallel
      await Promise.all(batch.map(user => migrateUser(user)));

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Print migration summary
    console.log('\n🎯 Migration Summary');
    console.log('===================');
    console.log(`Total Users: ${stats.totalUsers}`);
    console.log(`Users with Legacy Credits: ${stats.usersWithLegacyCredits}`);
    console.log(`Users Already Global: ${stats.usersAlreadyGlobal}`);
    console.log(`Successfully Migrated: ${stats.migratedUsers}`);
    console.log(`Errors: ${stats.errors}`);

    if (stats.errors > 0) {
      console.log('\n❌ Error Details:');
      stats.errorDetails.forEach((error, index) => {
        console.log(`${index + 1}. ${error.email}: ${error.error}`);
      });
    }

    if (DRY_RUN) {
      console.log('\n💡 This was a dry run. To actually migrate users, run without --dry-run flag');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
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
 * Handle script termination
 */
process.on('SIGINT', async () => {
  console.log('\n⚠️ Migration interrupted by user');
  await cleanup();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await cleanup();
  process.exit(1);
});

/**
 * Main execution
 */
async function main() {
  await connectToDatabase();
  await runMigration();
  await cleanup();
  process.exit(0);
}

// Run the migration
main().catch(async (error) => {
  console.error('💥 Unexpected error:', error);
  await cleanup();
  process.exit(1);
});