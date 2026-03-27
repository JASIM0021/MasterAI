const mongoose = require('mongoose');
const CronJob = require('./models/CronJob');
const Schedule = require('./models/Schedule');
require('dotenv').config();

// Use the same connection as the main app
mongoose.connect(process.env.MONGO_URL, {
  dbName: 'masterAiApiKey',
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testCleanup() {
  console.log('🧪 Testing Cron Job Cleanup System');
  console.log('==================================\n');

  try {
    // Get counts before cleanup
    const beforeActiveCronJobs = await CronJob.countDocuments({ isActive: true });
    const beforeActiveSchedules = await Schedule.countDocuments({ isActive: true });

    console.log(`📊 Before cleanup:`);
    console.log(`   Active cron jobs: ${beforeActiveCronJobs}`);
    console.log(`   Active schedules: ${beforeActiveSchedules}`);

    // Import the scheduler service to test its cleanup method
    const SchedulerService = require('./services/schedulerService');

    // Access the singleton instance
    const schedulerService = SchedulerService;

    // Test the cleanup method
    console.log('\n🧹 Running cleanup...');
    await schedulerService.cleanupOrphanedCronJobs();

    // Get counts after cleanup
    const afterActiveCronJobs = await CronJob.countDocuments({ isActive: true });
    const afterActiveSchedules = await Schedule.countDocuments({ isActive: true });

    console.log(`\n📊 After cleanup:`);
    console.log(`   Active cron jobs: ${afterActiveCronJobs}`);
    console.log(`   Active schedules: ${afterActiveSchedules}`);

    const cleanedUp = beforeActiveCronJobs - afterActiveCronJobs;
    console.log(`\n✅ Cleanup completed: ${cleanedUp} cron jobs cleaned up`);

    if (cleanedUp > 0) {
      console.log('🎉 Cleanup system working properly!');
    } else {
      console.log('ℹ️ No cleanup was needed - all jobs are valid');
    }

  } catch (error) {
    console.error('❌ Error during cleanup test:', error);
  } finally {
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB');
  testCleanup();
});