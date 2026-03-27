const cron = require('node-cron');
const User = require('../models/User');
const Credit = require('../models/Credit');

class CreditResetService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the credit reset service with scheduled jobs
   */
  initialize() {
    if (this.isInitialized) {
      console.log('Credit reset service already initialized');
      return;
    }

    // Run credit reset check every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running credit reset check...');
      try {
        await this.checkAndResetExpiredCredits();
      } catch (error) {
        console.error('Credit reset job error:', error);
      }
    });

    // Run at midnight every day for daily resets
    cron.schedule('0 0 * * *', async () => {
      console.log('🌙 Running daily credit reset...');
      try {
        await this.resetCreditsByInterval('daily');
      } catch (error) {
        console.error('Daily credit reset error:', error);
      }
    });

    // Run at midnight every Monday for weekly resets
    cron.schedule('0 0 * * 1', async () => {
      console.log('📅 Running weekly credit reset...');
      try {
        await this.resetCreditsByInterval('weekly');
      } catch (error) {
        console.error('Weekly credit reset error:', error);
      }
    });

    // Run on 1st of every month for monthly resets
    cron.schedule('0 0 1 * *', async () => {
      console.log('📆 Running monthly credit reset...');
      try {
        await this.resetCreditsByInterval('monthly');
      } catch (error) {
        console.error('Monthly credit reset error:', error);
      }
    });

    // Run on 1st of January for yearly resets
    cron.schedule('0 0 1 1 *', async () => {
      console.log('🗓️ Running yearly credit reset...');
      try {
        await this.resetCreditsByInterval('yearly');
      } catch (error) {
        console.error('Yearly credit reset error:', error);
      }
    });

    // Add monthly global credits (+100 credits per month) - runs on 1st of every month at 1 AM
    cron.schedule('0 1 1 * *', async () => {
      console.log('💰 Running monthly global credit addition (+100 credits)...');
      try {
        await this.addMonthlyGlobalCredits();
      } catch (error) {
        console.error('Monthly global credit addition error:', error);
      }
    });

    this.isInitialized = true;
    console.log('✅ Credit reset service initialized');
  }

  /**
   * Check and reset credits for users whose reset date has passed
   */
  async checkAndResetExpiredCredits() {
    try {
      const now = new Date();

      // Find users whose credit reset date has passed
      const usersToReset = await User.find({
        'credits.automation.resetDate': { $lte: now }
      });

      console.log(`Found ${usersToReset.length} users with expired credit periods`);

      let resetCount = 0;
      for (const user of usersToReset) {
        try {
          const oldUsed = user.credits.automation.used;
          await user.checkAndResetCredits();

          console.log(`✅ Reset credits for user ${user.email}: ${oldUsed} → 0`);
          resetCount++;
        } catch (error) {
          console.error(`Failed to reset credits for user ${user.email}:`, error);
        }
      }

      if (resetCount > 0) {
        console.log(`🎯 Successfully reset credits for ${resetCount} users`);
      }

      return resetCount;
    } catch (error) {
      console.error('Error checking expired credits:', error);
      throw error;
    }
  }

  /**
   * Reset credits for all users with a specific reset interval
   */
  async resetCreditsByInterval(interval) {
    try {
      const users = await User.find({
        'credits.automation.resetInterval': interval
      });

      console.log(`Processing ${interval} reset for ${users.length} users`);

      let resetCount = 0;
      for (const user of users) {
        try {
          const oldUsed = user.credits.automation.used;

          // Reset credits
          user.credits.automation.used = 0;

          // Calculate next reset date
          const nextReset = new Date();
          switch (interval) {
            case 'daily':
              nextReset.setDate(nextReset.getDate() + 1);
              break;
            case 'weekly':
              nextReset.setDate(nextReset.getDate() + 7);
              break;
            case 'monthly':
              nextReset.setMonth(nextReset.getMonth() + 1);
              break;
            case 'yearly':
              nextReset.setFullYear(nextReset.getFullYear() + 1);
              break;
          }

          user.credits.automation.resetDate = nextReset;
          user.markModified('credits.automation');
          await user.save();

          console.log(`✅ ${interval} reset for user ${user.email}: ${oldUsed} → 0, next reset: ${nextReset.toISOString()}`);
          resetCount++;
        } catch (error) {
          console.error(`Failed ${interval} reset for user ${user.email}:`, error);
        }
      }

      console.log(`🎯 Successfully completed ${interval} reset for ${resetCount} users`);
      return resetCount;
    } catch (error) {
      console.error(`Error during ${interval} credit reset:`, error);
      throw error;
    }
  }

  /**
   * Add monthly global credits to all users (+100 credits per month)
   */
  async addMonthlyGlobalCredits() {
    try {
      console.log('🚀 Starting monthly global credit addition process...');

      // Get all users
      const users = await User.find({});
      console.log(`📊 Found ${users.length} users for monthly credit addition`);

      let addedCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Find or create credits for this user
          const credits = await Credit.findOrCreateForUser(user._id);

          // Get balance before addition
          const balanceBefore = credits.globalCredits.balance;

          // Add monthly credits (+100)
          await credits.addMonthlyCredits();

          // Get balance after addition
          const balanceAfter = credits.globalCredits.balance;

          console.log(`💰 Added 100 credits to ${user.email}: ${balanceBefore} → ${balanceAfter}`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Failed to add monthly credits for user ${user.email}:`, error.message);
          errorCount++;
        }
      }

      const successMessage = `✅ Monthly credit addition completed: ${addedCount} successful, ${errorCount} errors`;
      console.log(successMessage);

      return {
        totalUsers: users.length,
        successful: addedCount,
        errors: errorCount,
        message: successMessage
      };
    } catch (error) {
      console.error('💥 Error during monthly global credit addition:', error);
      throw error;
    }
  }

  /**
   * Manually reset credits for a specific user
   */
  async resetUserCredits(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const oldUsed = user.credits.automation.used;
      await user.checkAndResetCredits();

      console.log(`✅ Manual reset for user ${user.email}: ${oldUsed} → ${user.credits.automation.used}`);

      return user.getCreditInfo();
    } catch (error) {
      console.error(`Error manually resetting credits for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get credit reset statistics
   */
  async getCreditStats() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$credits.automation.resetInterval',
            totalUsers: { $sum: 1 },
            totalCreditsUsed: { $sum: '$credits.automation.used' },
            totalCreditsAvailable: { $sum: '$credits.automation.total' },
            averageUsage: { $avg: '$credits.automation.used' },
            usersAtLimit: {
              $sum: {
                $cond: [
                  { $gte: ['$credits.automation.used', '$credits.automation.total'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            resetInterval: '$_id',
            totalUsers: 1,
            totalCreditsUsed: 1,
            totalCreditsAvailable: 1,
            averageUsage: { $round: ['$averageUsage', 2] },
            usersAtLimit: 1,
            usagePercentage: {
              $round: [
                { $multiply: [{ $divide: ['$totalCreditsUsed', '$totalCreditsAvailable'] }, 100] },
                2
              ]
            }
          }
        }
      ]);

      // Get users needing reset soon
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const usersNeedingReset = await User.countDocuments({
        'credits.automation.resetDate': { $lte: tomorrow }
      });

      return {
        intervalStats: stats,
        usersNeedingResetSoon: usersNeedingReset,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating credit stats:', error);
      throw error;
    }
  }

  /**
   * Bulk update credit limits for users
   */
  async updateCreditLimits(criteria, newLimit) {
    try {
      const result = await User.updateMany(
        criteria,
        { $set: { 'credits.automation.total': newLimit } }
      );

      console.log(`📊 Updated credit limits for ${result.modifiedCount} users to ${newLimit}`);
      return result;
    } catch (error) {
      console.error('Error updating credit limits:', error);
      throw error;
    }
  }

  /**
   * Get users who are approaching their credit limit
   */
  async getUsersApproachingLimit(threshold = 0.8) {
    try {
      const users = await User.find({
        $expr: {
          $gte: [
            { $divide: ['$credits.automation.used', '$credits.automation.total'] },
            threshold
          ]
        }
      }).select('email name credits.automation');

      return users.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        used: user.credits.automation.used,
        total: user.credits.automation.total,
        percentage: Math.round((user.credits.automation.used / user.credits.automation.total) * 100),
        resetDate: user.credits.automation.resetDate
      }));
    } catch (error) {
      console.error('Error finding users approaching limit:', error);
      throw error;
    }
  }
}

// Create singleton instance
const creditResetService = new CreditResetService();

// Auto-initialize when module is loaded
creditResetService.initialize();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down credit reset service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down credit reset service...');
  process.exit(0);
});

module.exports = creditResetService;