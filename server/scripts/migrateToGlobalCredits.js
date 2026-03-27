const mongoose = require('mongoose');
const Credit = require('../models/Credit');
const CreditTransaction = require('../models/CreditTransaction');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

class GlobalCreditMigration {
  constructor() {
    this.stats = {
      totalUsers: 0,
      migratedUsers: 0,
      alreadyMigrated: 0,
      failedMigrations: 0,
      totalCreditsConverted: 0,
      errors: []
    };
  }

  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGO_URL, {
        dbName: 'masterAiApiKey',
      });
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }

  async migrateAllUsers() {
    console.log('\n🚀 Starting migration to global credit system...\n');

    try {
      // Get all users with credit data
      const users = await User.find({}).select('_id name email subscription.plan');
      this.stats.totalUsers = users.length;

      console.log(`Found ${users.length} users to process`);

      for (const user of users) {
        await this.migrateUser(user);
      }

      this.printFinalReport();

    } catch (error) {
      console.error('❌ Migration error:', error);
      this.stats.errors.push({
        type: 'migration_error',
        message: error.message,
        stack: error.stack
      });
    }
  }

  async migrateUser(user) {
    try {
      console.log(`\n📝 Processing user: ${user.email || user._id}`);

      // Get user's current credit data
      const credits = await Credit.findOne({ userId: user._id });

      if (!credits) {
        console.log('   ⚠️  No credit data found, creating new record with global credits');
        await Credit.findOrCreateForUser(user._id, true); // Enable global credits for new users
        this.stats.migratedUsers++;
        return;
      }

      // Check if already migrated
      if (credits.isGlobalCreditsEnabled()) {
        console.log('   ✅ Already using global credit system');
        this.stats.alreadyMigrated++;
        return;
      }

      // Calculate total remaining credits from legacy system
      const legacyCreditsRemaining = this.calculateLegacyCredits(credits);

      console.log(`   💳 Legacy credits remaining: ${legacyCreditsRemaining}`);

      if (legacyCreditsRemaining > 0) {
        // Migrate to global credits with converted balance
        await credits.migrateToGlobalCredits();
        this.stats.totalCreditsConverted += legacyCreditsRemaining;
        console.log(`   ✅ Migrated ${legacyCreditsRemaining} credits to global system`);
      } else {
        // Enable global credits with starter bonus
        await credits.enableGlobalCredits(50); // Give 50 bonus credits
        console.log('   ✅ Enabled global credits with 50 bonus credits');

        // Log bonus transaction
        await CreditTransaction.logTransaction({
          userId: user._id,
          type: 'bonus',
          amount: 50,
          description: 'Migration bonus - 50 free credits',
          metadata: {
            source: 'migration_bonus',
            notes: 'Bonus credits for migrating to global system'
          }
        });
      }

      this.stats.migratedUsers++;

    } catch (error) {
      console.error(`   ❌ Error migrating user ${user.email || user._id}:`, error.message);
      this.stats.failedMigrations++;
      this.stats.errors.push({
        userId: user._id,
        email: user.email,
        type: 'user_migration_error',
        message: error.message
      });
    }
  }

  calculateLegacyCredits(credits) {
    const services = ['postGeneration', 'captionGeneration', 'aiImageEdit', 'aiImageGeneration'];
    let totalRemaining = 0;

    for (const service of services) {
      if (credits[service]) {
        const remaining = Math.max(0, credits[service].total - credits[service].used);
        totalRemaining += remaining;
      }
    }

    // Add automation credits
    if (credits.automation?.available) {
      totalRemaining += credits.automation.available;
    }

    // Add execution credits (convert at a lower rate since they're more abundant)
    if (credits.execution?.available) {
      totalRemaining += Math.floor(credits.execution.available / 10); // 10:1 conversion rate
    }

    return totalRemaining;
  }

  async migrateSpecificUsers(userIds) {
    console.log(`\n🎯 Migrating specific users: ${userIds.join(', ')}\n`);

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`❌ User not found: ${userId}`);
          continue;
        }

        await this.migrateUser(user);
      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error.message);
      }
    }

    this.printFinalReport();
  }

  async rollbackUser(userId) {
    console.log(`\n🔄 Rolling back user ${userId} to legacy credit system...`);

    try {
      const credits = await Credit.findOne({ userId });

      if (!credits || !credits.isGlobalCreditsEnabled()) {
        console.log('   ⚠️  User is not using global credit system');
        return;
      }

      // Reset global credits
      credits.globalCredits.enabledAt = null;
      credits.globalCredits.balance = 0;
      credits.globalCredits.totalPurchased = 0;
      credits.globalCredits.totalUsed = 0;

      // Reset legacy credits to defaults
      credits.postGeneration = { used: 0, total: 50 };
      credits.captionGeneration = { used: 0, total: 50 };
      credits.aiImageEdit = { used: 0, total: 50 };
      credits.aiImageGeneration = { used: 0, total: 50 };

      await credits.save();

      console.log('   ✅ Rollback completed');

    } catch (error) {
      console.error(`   ❌ Rollback error:`, error.message);
    }
  }

  async verifyMigration() {
    console.log('\n🔍 Verifying migration results...\n');

    const totalCredits = await Credit.countDocuments();
    const globalCreditsEnabled = await Credit.countDocuments({
      'globalCredits.enabledAt': { $ne: null }
    });
    const legacyCreditsOnly = totalCredits - globalCreditsEnabled;

    console.log(`📊 Migration Status:`);
    console.log(`   Total credit records: ${totalCredits}`);
    console.log(`   Using global credits: ${globalCreditsEnabled}`);
    console.log(`   Using legacy credits: ${legacyCreditsOnly}`);
    console.log(`   Migration percentage: ${((globalCreditsEnabled / totalCredits) * 100).toFixed(1)}%`);

    // Check for any issues
    const creditTransactions = await CreditTransaction.countDocuments({
      type: 'bonus',
      'metadata.source': 'system_migration'
    });

    console.log(`   Migration transactions logged: ${creditTransactions}`);
  }

  printFinalReport() {
    console.log('\n📊 MIGRATION REPORT');
    console.log('='.repeat(50));
    console.log(`Total users processed: ${this.stats.totalUsers}`);
    console.log(`Successfully migrated: ${this.stats.migratedUsers}`);
    console.log(`Already migrated: ${this.stats.alreadyMigrated}`);
    console.log(`Failed migrations: ${this.stats.failedMigrations}`);
    console.log(`Total credits converted: ${this.stats.totalCreditsConverted}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${this.stats.errors.length}`);
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}: ${error.message}`);
        if (error.userId) {
          console.log(`   User: ${error.email || error.userId}`);
        }
      });
    }

    console.log('\n' + '='.repeat(50));

    const successRate = ((this.stats.migratedUsers / this.stats.totalUsers) * 100).toFixed(1);
    console.log(`✅ Migration success rate: ${successRate}%`);
  }
}

// Command line interface
async function main() {
  const migration = new GlobalCreditMigration();

  try {
    await migration.connect();

    const command = process.argv[2];
    const argument = process.argv[3];

    switch (command) {
      case 'migrate-all':
        await migration.migrateAllUsers();
        break;

      case 'migrate-user':
        if (!argument) {
          console.log('❌ Please provide a user ID: npm run migrate-user <userId>');
          return;
        }
        await migration.migrateSpecificUsers([argument]);
        break;

      case 'migrate-users':
        if (!argument) {
          console.log('❌ Please provide comma-separated user IDs: npm run migrate-users <userId1,userId2>');
          return;
        }
        const userIds = argument.split(',').map(id => id.trim());
        await migration.migrateSpecificUsers(userIds);
        break;

      case 'rollback':
        if (!argument) {
          console.log('❌ Please provide a user ID: npm run rollback <userId>');
          return;
        }
        await migration.rollbackUser(argument);
        break;

      case 'verify':
        await migration.verifyMigration();
        break;

      default:
        console.log('🚀 Global Credit Migration Tool');
        console.log('\nUsage:');
        console.log('  node scripts/migrateToGlobalCredits.js <command> [arguments]');
        console.log('\nCommands:');
        console.log('  migrate-all                 - Migrate all users to global credits');
        console.log('  migrate-user <userId>       - Migrate specific user');
        console.log('  migrate-users <id1,id2>     - Migrate multiple users');
        console.log('  rollback <userId>           - Rollback user to legacy system');
        console.log('  verify                      - Verify migration status');
        console.log('\nExamples:');
        console.log('  node scripts/migrateToGlobalCredits.js migrate-all');
        console.log('  node scripts/migrateToGlobalCredits.js migrate-user 507f1f77bcf86cd799439011');
        console.log('  node scripts/migrateToGlobalCredits.js verify');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await migration.disconnect();
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = GlobalCreditMigration;