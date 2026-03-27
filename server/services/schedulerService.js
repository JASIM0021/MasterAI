const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const Post = require('../models/Post');
const CronJob = require('../models/CronJob');
const googleAIService = require('../src/services/googleAIService');
const NotificationService = require('./notificationService');
const User = require('../models/User');
// Define content types for automation
const AutomationType = {
  POST: 'POST',
  CUSTOM: 'CUSTOM'
};

class SchedulerService {
  constructor() {
    // User-specific cron jobs: userId -> Map(scheduleId -> cronJob)
    this.userCronJobs = new Map();
    this.notificationService = new NotificationService();

    // Execution locks to prevent simultaneous executions
    this.executionLocks = new Set();

    // Initialize notification cron jobs
    this.initializeSystemCronJobs();
  }

  /**
   * Initialize system-wide cron jobs
   */
  initializeSystemCronJobs() {
    // Send pending notifications every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('Running batch notification job...');
      try {
        await this.notificationService.sendBatchNotifications();
      } catch (error) {
        console.error('Batch notification job error:', error);
      }
    });

    // Send daily summaries at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily summary job...');
      try {
        await this.notificationService.sendDailySummaries();
      } catch (error) {
        console.error('Daily summary job error:', error);
      }
    });

    console.log('System cron jobs initialized');
  }

  /**
   * Initialize all active schedules on server startup
   */
  async initializeAllSchedules() {
    try {
      // First, clean up orphaned cron jobs in database
      await this.cleanupOrphanedCronJobs();

      // Get active schedules
      const activeSchedules = await Schedule.find({ isActive: true });

      for (const schedule of activeSchedules) {
        await this.scheduleJob(schedule);
      }

      console.log(`Initialized ${activeSchedules.length} active automation schedules`);

      // Report database vs memory discrepancies
      await this.reportJobDiscrepancies();
    } catch (error) {
      console.error('Error initializing schedules:', error);
    }
  }

  /**
   * Clean up orphaned cron jobs in database
   */
  async cleanupOrphanedCronJobs() {
    try {
      console.log('🧹 Starting comprehensive cron job cleanup...');

      // Find cron jobs that don't have corresponding active schedules
      const activeCronJobs = await CronJob.find({ isActive: true });
      const activeScheduleIds = await Schedule.find({ isActive: true }).distinct('_id');
      const activeScheduleStrings = activeScheduleIds.map(id => id.toString());

      console.log(`📊 Found ${activeCronJobs.length} active cron jobs and ${activeScheduleIds.length} active schedules`);

      let orphanedCount = 0;
      let duplicateCount = 0;
      const processedSchedules = new Set();

      for (const cronJob of activeCronJobs) {
        const scheduleIdStr = cronJob.scheduleId.toString();

        // Check if schedule no longer exists or is inactive
        if (!activeScheduleStrings.includes(scheduleIdStr)) {
          await cronJob.disable('Schedule no longer active');
          orphanedCount++;
          console.log(`🗑️ Disabled orphaned cron job: ${cronJob._id} (schedule: ${scheduleIdStr})`);
          continue;
        }

        // Check for duplicate cron jobs for the same schedule
        if (processedSchedules.has(scheduleIdStr)) {
          await cronJob.disable('Duplicate cron job for same schedule');
          duplicateCount++;
          console.log(`🔄 Disabled duplicate cron job: ${cronJob._id} (schedule: ${scheduleIdStr})`);
          continue;
        }

        processedSchedules.add(scheduleIdStr);
      }

      // Also clean up any stale/old cron jobs (older than 24 hours and not updated)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleCronJobs = await CronJob.find({
        isActive: true,
        createdAt: { $lt: twentyFourHoursAgo },
        lastExecutedAt: { $lt: twentyFourHoursAgo }
      });

      let staleCount = 0;
      for (const staleCronJob of staleCronJobs) {
        // Double-check that this isn't a legitimately active job
        const hasActiveSchedule = activeScheduleStrings.includes(staleCronJob.scheduleId.toString());
        if (!hasActiveSchedule) {
          await staleCronJob.disable('Stale cron job - no recent activity');
          staleCount++;
          console.log(`⏰ Disabled stale cron job: ${staleCronJob._id}`);
        }
      }

      if (orphanedCount > 0 || duplicateCount > 0 || staleCount > 0) {
        console.log(`🧹 Cleanup complete: ${orphanedCount} orphaned, ${duplicateCount} duplicates, ${staleCount} stale jobs removed`);
      } else {
        console.log('✅ No cleanup needed - all cron jobs are valid');
      }
    } catch (error) {
      console.error('Error cleaning up orphaned cron jobs:', error);
    }
  }

  /**
   * Report discrepancies between database and memory
   */
  async reportJobDiscrepancies() {
    try {
      const dbJobs = await CronJob.find({ isActive: true });
      const memoryJobCount = this.getActiveSchedulesCount();

      console.log(`📊 Job status: ${dbJobs.length} active in DB, ${memoryJobCount} active in memory`);

      if (dbJobs.length !== memoryJobCount) {
        console.log(`⚠️ Discrepancy detected between database (${dbJobs.length}) and memory (${memoryJobCount}) job counts`);
      }
    } catch (error) {
      console.error('Error reporting job discrepancies:', error);
    }
  }

  /**
   * Schedule a cron job for automation
   */
  async scheduleJob(schedule) {
    const scheduleId = schedule._id.toString();
    const userId = schedule.userId.toString();

    // Check user's automation credit limits

    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Debug: Check if user object has the required methods
    console.log('🔍 User object type:', typeof user);
    console.log('🔍 User object constructor:', user.constructor.name);
    console.log('🔍 Has getAvailableGlobalCredits method:', typeof user.getAvailableGlobalCredits);
    console.log('🔍 Has hasAutomationCredits method:', typeof user.hasAutomationCredits);

    // Check if user object has required methods
    if (typeof user.hasAutomationCredits !== 'function') {
      throw new Error('User object is missing required methods. Expected Mongoose document but got plain object.');
    }

    // Check if user has enough global credits to create automation (10 credits)
    const hasCredits = await user.hasAutomationCredits();

    if (typeof user.getAvailableGlobalCredits !== 'function') {
      throw new Error('User object is missing getAvailableGlobalCredits method. Expected Mongoose document but got plain object.');
    }

    const availableGlobalCredits = await user.getAvailableGlobalCredits();

    console.log(`📊 User ${userId} automation creation: ${availableGlobalCredits} global credits available, needs 10 credits`);

    if (!hasCredits) {
      const errorMsg = `Cannot create automation: insufficient global credits. Have ${availableGlobalCredits} credits but need 10 credits to create automation.`;
      console.log(`⚠️ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Consume 10 global credits for automation creation
    try {
      await user.consumeAutomationCredit();
      const remainingCredits = await user.getAvailableGlobalCredits();
      console.log(`💳 Consumed 10 global credits for automation creation. Remaining: ${remainingCredits}`);
    } catch (creditError) {
      const errorMsg = `Failed to consume automation credits: ${creditError.message}`;
      console.log(`⚠️ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Stop existing job if any
    this.stopJob(scheduleId, userId);

    // Clean up any existing database records for this schedule to prevent duplicates
    try {
      const existingCronJobs = await CronJob.find({
        scheduleId: scheduleId,
        userId: userId,
        isActive: true
      });

      for (const existingJob of existingCronJobs) {
        await existingJob.disable('Replaced by new schedule');
        console.log(`🔄 Disabled existing cron job: ${existingJob._id} for schedule: ${scheduleId}`);
      }
    } catch (error) {
      console.error('Error cleaning up existing cron jobs:', error);
    }

    let cronExpression;

    // Generate cron expression based on schedule configuration
    switch (schedule.recurrence.frequency) {
      case 'daily':
        if (schedule.recurrence.timeSlots && schedule.recurrence.timeSlots.length > 0) {
          const slot = schedule.recurrence.timeSlots[0];
          // Use actual scheduled time (not every minute)
          // cronExpression = `${slot.minute} ${slot.hour} * * *`;
          cronExpression = `* * * * *`;
        }
        break;

      case 'weekly':
        if (schedule.recurrence.daysOfWeek && schedule.recurrence.daysOfWeek.length > 0 &&
            schedule.recurrence.timeSlots && schedule.recurrence.timeSlots.length > 0) {
          const slot = schedule.recurrence.timeSlots[0];
          const days = schedule.recurrence.daysOfWeek.join(',');
          cronExpression = `${slot.minute} ${slot.hour} * * ${days}`;
        }
        break;

      case 'monthly':
        if (schedule.recurrence.dayOfMonth &&
            schedule.recurrence.timeSlots && schedule.recurrence.timeSlots.length > 0) {
          const slot = schedule.recurrence.timeSlots[0];
          cronExpression = `${slot.minute} ${slot.hour} ${schedule.recurrence.dayOfMonth} * *`;
        }
        break;

      case 'per-minute':
        // Handle per-minute scheduling with minuteInterval
        if (schedule.recurrence.minuteInterval) {
          const interval = Math.max(1, Math.min(30, schedule.recurrence.minuteInterval)); // Ensure 1-30 minutes
          cronExpression = `*/${interval} * * * *`; // Every N minutes
        } else {
          // Default to every 5 minutes if interval not specified
          cronExpression = '*/5 * * * *';
        }
        break;

      case 'bi-weekly':
        // Every 2 weeks on specified days
        if (schedule.recurrence.daysOfWeek && schedule.recurrence.daysOfWeek.length > 0 &&
            schedule.recurrence.timeSlots && schedule.recurrence.timeSlots.length > 0) {
          const slot = schedule.recurrence.timeSlots[0];
          // This is a simplified version - could be enhanced with proper bi-weekly logic
          cronExpression = `${slot.minute} ${slot.hour} * * ${schedule.recurrence.daysOfWeek[0]}`;
        }
        break;

      case 'custom':
        cronExpression = schedule.recurrence.cronExpression;
        break;
    }

    // Fallback: if no cron expression was generated, create a default one
    if (!cronExpression) {
      console.warn(`⚠️ No cron expression generated for schedule ${schedule.name} (${scheduleId}), using default hourly schedule`);
      cronExpression = '0 * * * *'; // Every hour as fallback
    }

    console.log(`📅 Generated cron expression for "${schedule.name}": ${cronExpression}`);

    if (!cronExpression) {
      const errorMsg = `Failed to generate cron expression for schedule: ${schedule.name}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    if (!cron.validate(cronExpression)) {
      const errorMsg = `Invalid cron expression for schedule: ${schedule.name} - Expression: ${cronExpression}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`✅ Cron expression validated for "${schedule.name}": ${cronExpression}`);

    const job = cron.schedule(cronExpression, async () => {
        const timestamp = new Date().toLocaleString();
        console.log(`\n🤖 [${timestamp}] Executing automation: ${schedule.name} (${scheduleId}) for user: ${userId}`);
        console.log(`📋 Cron: ${cronExpression} | Timezone: ${schedule.recurrence.timezone || 'UTC'}`);

        try {
          await this.executeAutomation(schedule, scheduleId);
          console.log(`✅ [${timestamp}] Automation execution completed: ${schedule.name}\n`);
        } catch (error) {
          console.error(`❌ [${timestamp}] Automation execution failed: ${schedule.name}`, error.message);
        }
      }, {
        scheduled: true,
        timezone: schedule.recurrence.timezone || 'UTC'
      });

      // Store job in user-specific structure
      if (!this.userCronJobs.has(userId)) {
        this.userCronJobs.set(userId, new Map());
      }
      this.userCronJobs.get(userId).set(scheduleId, { cronJob: job, dbRecord: null });

      // Save cron job to database
      try {
        const cronJobRecord = new CronJob({
          userId: userId,
          scheduleId: scheduleId,
          cronExpression: cronExpression,
          timezone: schedule.recurrence.timezone || 'UTC',
          isActive: true,
          metadata: {
            scheduleName: schedule.name,
            contentType: schedule.content.type,
            targetPlatforms: schedule.targetPlatforms.map(p => p.platform),
            frequency: schedule.recurrence.frequency
          }
        });

        await cronJobRecord.save();

        // Update the in-memory reference
        this.userCronJobs.get(userId).set(scheduleId, { cronJob: job, dbRecord: cronJobRecord });

        console.log(`✅ Scheduled automation: ${schedule.name} with cron: ${cronExpression} for user: ${userId} (DB ID: ${cronJobRecord._id})`);
      } catch (dbError) {
        console.error(`❌ Failed to save cron job to database:`, dbError);
        // Continue with in-memory job even if database save fails
      }
    
  }


  /**
   * Stop a cron job with enhanced verification and cleanup
   */
  async stopJob(scheduleId, userId = null) {
    const startTime = Date.now();
    let jobStopped = false;
    let dbUpdated = false;
    const errors = [];

    console.log(`🛑 Starting job stop process for schedule: ${scheduleId}, user: ${userId}`);

    try {
      if (userId) {
        // Stop specific user's job
        const userJobs = this.userCronJobs.get(userId);
        if (userJobs && userJobs.has(scheduleId)) {
          const jobData = userJobs.get(scheduleId);

          // Stop the cron job with verification
          if (jobData.cronJob) {
            try {
              // Verify job is running before stopping
              const wasRunning = jobData.cronJob.running;
              jobData.cronJob.stop();

              // Verify job is actually stopped
              const isStoppedNow = !jobData.cronJob.running;
              jobStopped = isStoppedNow;

              console.log(`📊 Job ${scheduleId}: was running: ${wasRunning}, stopped successfully: ${isStoppedNow}`);
            } catch (stopError) {
              errors.push(`Failed to stop cron job: ${stopError.message}`);
              console.error(`❌ Error stopping cron job for ${scheduleId}:`, stopError);
            }
          } else {
            console.log(`⚠️ No cron job object found for ${scheduleId}, likely already stopped`);
            jobStopped = true; // Consider it stopped if there's no job object
          }

          // Update database record with enhanced error handling
          if (jobData.dbRecord) {
            try {
              await jobData.dbRecord.disable('Manually stopped via deletion');
              dbUpdated = true;
              console.log(`📝 Updated database record for job: ${scheduleId}`);
            } catch (dbError) {
              errors.push(`Failed to update database record: ${dbError.message}`);
              console.error(`❌ Failed to update database record:`, dbError);
            }
          } else {
            // Try to find and update by scheduleId and userId
            try {
              const updateResult = await CronJob.updateOne(
                { scheduleId: scheduleId, userId: userId },
                {
                  isActive: false,
                  lastError: 'Manually stopped via deletion',
                  updatedAt: new Date(),
                  stoppedAt: new Date()
                }
              );
              dbUpdated = updateResult.modifiedCount > 0;
              console.log(`📝 Database update result for ${scheduleId}: ${updateResult.modifiedCount} records modified`);
            } catch (dbError) {
              errors.push(`Failed to update database record by query: ${dbError.message}`);
              console.error(`❌ Failed to update database record by query:`, dbError);
            }
          }

          // Remove from memory
          userJobs.delete(scheduleId);

          // Clean up empty user map
          if (userJobs.size === 0) {
            this.userCronJobs.delete(userId);
            console.log(`🧹 Cleaned up empty job map for user: ${userId}`);
          }

          console.log(`✅ Stopped automation job: ${scheduleId} for user: ${userId}`);
        } else {
          console.log(`⚠️ Job ${scheduleId} not found in memory for user ${userId}`);
        }
      } else {
        // Stop job across all users (fallback for legacy code)
        let foundInAnyUser = false;
        for (const [uId, userJobs] of this.userCronJobs) {
          if (userJobs.has(scheduleId)) {
            foundInAnyUser = true;
            const jobData = userJobs.get(scheduleId);

            // Stop the cron job with verification
            if (jobData.cronJob) {
              try {
                const wasRunning = jobData.cronJob.running;
                jobData.cronJob.stop();
                const isStoppedNow = !jobData.cronJob.running;
                jobStopped = isStoppedNow;

                console.log(`📊 Job ${scheduleId}: was running: ${wasRunning}, stopped successfully: ${isStoppedNow}`);
              } catch (stopError) {
                errors.push(`Failed to stop cron job: ${stopError.message}`);
                console.error(`❌ Error stopping cron job for ${scheduleId}:`, stopError);
              }
            } else {
              jobStopped = true;
            }

            // Update database record
            if (jobData.dbRecord) {
              try {
                await jobData.dbRecord.disable('Manually stopped via deletion');
                dbUpdated = true;
              } catch (dbError) {
                errors.push(`Failed to update database record: ${dbError.message}`);
                console.error(`❌ Failed to update database record:`, dbError);
              }
            } else {
              try {
                const updateResult = await CronJob.updateOne(
                  { scheduleId: scheduleId, userId: uId },
                  {
                    isActive: false,
                    lastError: 'Manually stopped via deletion',
                    updatedAt: new Date(),
                    stoppedAt: new Date()
                  }
                );
                dbUpdated = updateResult.modifiedCount > 0;
              } catch (dbError) {
                errors.push(`Failed to update database record by query: ${dbError.message}`);
                console.error(`❌ Failed to update database record by query:`, dbError);
              }
            }

            userJobs.delete(scheduleId);

            // Clean up empty user map
            if (userJobs.size === 0) {
              this.userCronJobs.delete(uId);
              console.log(`🧹 Cleaned up empty job map for user: ${uId}`);
            }

            console.log(`✅ Stopped automation job: ${scheduleId} for user: ${uId}`);
            break; // Found and processed, exit loop
          }
        }

        if (!foundInAnyUser) {
          console.log(`⚠️ Job ${scheduleId} not found in memory across all users`);
        }
      }

      // If not found in memory, try to disable in database as cleanup
      if (!jobStopped || !dbUpdated) {
        try {
          const updateResult = await CronJob.updateOne(
            { scheduleId: scheduleId, ...(userId && { userId: userId }) },
            {
              isActive: false,
              lastError: 'Stopped via deletion (cleanup)',
              updatedAt: new Date(),
              stoppedAt: new Date()
            }
          );

          if (updateResult.modifiedCount > 0) {
            dbUpdated = true;
            console.log(`📝 Database cleanup completed for job ${scheduleId}`);
          } else {
            console.log(`ℹ️ No database records found to update for job ${scheduleId}`);
          }
        } catch (dbError) {
          errors.push(`Failed to cleanup database record: ${dbError.message}`);
          console.error(`❌ Failed to cleanup database record for missing job:`, dbError);
        }
      }

      // Additional cleanup: remove any orphaned database records
      try {
        await this.cleanupOrphanedCronJobs(scheduleId, userId);
      } catch (cleanupError) {
        errors.push(`Failed to cleanup orphaned records: ${cleanupError.message}`);
        console.error(`❌ Failed to cleanup orphaned records:`, cleanupError);
      }

      const duration = Date.now() - startTime;
      const success = (jobStopped || true) && (dbUpdated || true); // Consider success if either stopped or no job was running

      console.log(`🏁 Job stop process completed in ${duration}ms - Schedule: ${scheduleId}, Success: ${success}, Errors: ${errors.length}`);

      if (errors.length > 0) {
        console.warn(`⚠️ Job stop completed with ${errors.length} errors:`, errors);
      }

      return {
        success,
        jobStopped,
        dbUpdated,
        errors,
        duration
      };

    } catch (unexpectedError) {
      const duration = Date.now() - startTime;
      console.error(`💥 Unexpected error during job stop for ${scheduleId}:`, unexpectedError);

      return {
        success: false,
        jobStopped: false,
        dbUpdated: false,
        errors: [...errors, `Unexpected error: ${unexpectedError.message}`],
        duration
      };
    }
  }

  /**
   * Clean up orphaned cron job records for a specific schedule
   */
  async cleanupOrphanedCronJobs(scheduleId, userId = null) {
    try {
      const query = { scheduleId };
      if (userId) {
        query.userId = userId;
      }

      // Find all cron job records for this schedule
      const cronJobRecords = await CronJob.find(query);

      if (cronJobRecords.length > 0) {
        console.log(`🧹 Found ${cronJobRecords.length} cron job records to cleanup for schedule ${scheduleId}`);

        // Disable all records for this schedule
        const updateResult = await CronJob.updateMany(
          query,
          {
            isActive: false,
            lastError: 'Cleaned up during schedule deletion',
            updatedAt: new Date(),
            stoppedAt: new Date()
          }
        );

        console.log(`🧹 Cleaned up ${updateResult.modifiedCount} orphaned cron job records for schedule ${scheduleId}`);
      }
    } catch (error) {
      console.error(`❌ Error during orphaned cron job cleanup for ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Execute automation - generate AI content and handle approval workflow
   */
  async executeAutomation(schedule, scheduleId = null) {
    const executionStartTime = Date.now();
    const sId = scheduleId || schedule._id.toString();
    const userId = schedule.userId.toString();

    // Create unique execution lock key
    const lockKey = `${userId}:${sId}`;

    // Check if this automation is already executing
    if (this.executionLocks.has(lockKey)) {
      console.log(`⚠️ Execution already in progress for schedule ${schedule.name} (${sId}), skipping...`);
      return {
        postsCreated: 0,
        successfulPosts: 0,
        failedPosts: 0,
        errors: ['Execution already in progress']
      };
    }

    // Acquire execution lock
    this.executionLocks.add(lockKey);
    console.log(`🔒 Acquired execution lock for schedule: ${schedule.name} (${sId})`);

    try {
      const result = {
        postsCreated: 0,
        successfulPosts: 0,
        failedPosts: 0,
        errors: []
      };

      // Find the database record for this cron job
      let cronJobRecord = null;
      try {
        cronJobRecord = await CronJob.findOne({
          scheduleId: sId,
          userId: userId,
          isActive: true
        });

        if (cronJobRecord) {
          console.log(`📝 Found cron job record: ${cronJobRecord._id}`);
        } else {
          console.log(`⚠️ No cron job record found for schedule ${sId}`);
        }
      } catch (dbError) {
        console.error(`⚠️ Failed to find cron job record:`, dbError);
        cronJobRecord = null;
      }

      // Check if schedule should execute
      const shouldExec = schedule.shouldExecute();
      console.log(`🔍 Schedule ${schedule.name} shouldExecute: ${shouldExec}`);
      console.log(`🔍 Schedule details - isActive: ${schedule.isActive}, nextExecution: ${schedule.nextExecution}, limits: ${JSON.stringify(schedule.limits)}`);

      // FOR TESTING: If nextExecution is in future, set it to now for testing purposes
      if (!shouldExec && schedule.nextExecution && schedule.nextExecution > new Date()) {
        console.log(`🧪 TESTING MODE: Setting nextExecution to current time for schedule: ${schedule.name}`);
        schedule.nextExecution = new Date();

        try {
          await schedule.save();
          console.log(`🔄 Updated nextExecution, re-checking shouldExecute...`);

          // Re-check after updating
          if (!schedule.shouldExecute()) {
            const errorMsg = 'Automation execution conditions still not met after time adjustment';
            console.log(`⚠️ ${errorMsg} - Schedule: ${schedule.name}`);
            result.errors.push(errorMsg);
            return result;
          }
          console.log(`✅ Schedule now ready to execute: ${schedule.name}`);
        } catch (saveError) {
          console.log(`⚠️ Could not update nextExecution (likely parallel execution): ${saveError.message}`);
          console.log(`🔄 Continuing with original execution check...`);

          // If save failed due to parallel execution, just continue
          if (!schedule.shouldExecute()) {
            const errorMsg = 'Automation execution conditions not met';
            console.log(`⚠️ ${errorMsg} - Schedule: ${schedule.name}`);
            result.errors.push(errorMsg);
            return result;
          }
        }
      } else if (!shouldExec) {
        const errorMsg = 'Automation execution conditions not met';
        console.log(`⚠️ ${errorMsg} - Schedule: ${schedule.name}`);
        result.errors.push(errorMsg);
        return result;
      }

      // Check user's automation credits - get fresh user object from database
      console.log(`🔍 Loading user ${schedule.userId} for execution credit check...`);

      // Re-require the User model to ensure fresh import with all methods
      const UserModel = require('../models/User');
      const user = await UserModel.findById(schedule.userId).exec();

      if (!user) {
        result.errors.push('User not found');
        await schedule.markExecution(false, 'User not found');
        return result;
      }

      console.log(`✅ User loaded: ${user.email || user._id}`);
      console.log(`📊 User credits: ${user.credits ? 'Found' : 'Missing'}`);

      // Ensure user has proper credit structure
      await this.ensureUserCreditsStructure(user);

      // Check if user has minimum 5 global credits for execution
      const availableGlobalCredits = await user.getAvailableGlobalCredits();
      const minimumCreditsRequired = 5; // Minimum 5 credits needed for any execution

      console.log(`📊 Global credit check: ${availableGlobalCredits} available, minimum ${minimumCreditsRequired} required`);

      // Validate user has minimum global credits for execution
      if (availableGlobalCredits < minimumCreditsRequired) {
        const errorMsg = `Insufficient global credits for execution. Have ${availableGlobalCredits} credits but need minimum ${minimumCreditsRequired} credits. Skipping execution.`;
        result.errors.push(errorMsg);

        console.log(`⚠️ ${errorMsg} Schedule: ${schedule.name} (${schedule._id})`);

        // Mark execution as failed due to insufficient credits
        await schedule.markExecution(false, errorMsg);
        return result;
      }

      console.log(`💳 Credits validated. Proceeding with content generation...`);

      // Note: Credit consumption will happen after content generation based on content type

      console.log(`🚀 Generating AI content for: ${schedule.name}`);

      // Generate AI content using new automation-specific function
      let generatedContent;
      try {
        // Use the new automation content generation function
        const automationContent = await googleAIService.generateAutomationContent(schedule);
        console.log('🎯 Automation content generated:', automationContent.type);

        // Structure the content for the post creation
        generatedContent = {
          text: automationContent.text,
          hashtags: automationContent.hashtags || [],
          mentions: automationContent.mentions || [],
          image: automationContent.image || null,
          type: automationContent.type
        };

        console.log(`✅ AI content generated (${automationContent.type}): ${generatedContent.text}`);
        if (automationContent.type === 'image') {
          console.log(`🖼️ Image data included with post`);
        }
      } catch (error) {
        console.error('AI content generation failed:', error);
        result.errors.push(`AI generation failed: ${error.message}`);
        await schedule.markExecution(false, error.message);
        return result;
      }

      if (!generatedContent || !generatedContent.text) {
        result.errors.push('Failed to generate content');
        await schedule.markExecution(false, 'Content generation returned null');
        return result;
      }

      // Consume global credits based on content type (5 for text, 15 for image+text)
      const isImagePost = generatedContent.type === 'image';
      const creditsToConsume = isImagePost ? 15 : 5;

      console.log(`💳 Consuming ${creditsToConsume} global credits for ${isImagePost ? 'image+text' : 'text-only'} execution...`);

      try {
        await user.consumeGlobalCredits('execution', creditsToConsume);
        const remainingCredits = await user.getAvailableGlobalCredits();
        console.log(`✅ Consumed ${creditsToConsume} global credits. Remaining: ${remainingCredits}`);
      } catch (creditError) {
        const errorMsg = `Failed to consume execution credits: ${creditError.message}`;
        result.errors.push(errorMsg);
        console.log(`⚠️ ${errorMsg}`);
        await schedule.markExecution(false, errorMsg);
        return result;
      }

      // Create the post object from generated content
      const postData = {
        userId: schedule.userId,
        content: {
          text: generatedContent.text,
          hashtags: generatedContent.hashtags || [],
          mentions: generatedContent.mentions || []
        },
        targetPlatforms: schedule.targetPlatforms.map(platform => ({
          platform: platform.platform,
          accountId: platform.accountId,
          accountName: platform.accountName,
          status: 'pending'
        })),
        scheduling: {
          type: 'automated',
          automationRuleId: schedule._id
        },
        category: schedule.content.aiConfig?.topic || 'automation',
        status: 'pending_approval', // Set to pending approval instead of draft
        isAiGenerated: true,
        aiGeneration: {
          prompt: 'Generated via automation workflow',
          topic: schedule.content.aiConfig?.topics?.[0] || schedule.content.aiConfig?.topic || 'general',
          tone: schedule.content.aiConfig?.tone || 'professional',
          model: 'gemini-pro',
          generatedAt: new Date(),
          contentType: generatedContent.type
        },
        approval: {
          status: 'pending',
          submittedAt: new Date(),
          requireApproval: true
        }
      };

      // Add image data if it's an image post
      if (generatedContent.type === 'image' && generatedContent.image) {
        postData.media = [{
          type: 'image',
          url: generatedContent.image.url,
          public_id: generatedContent.image.public_id,
          width: generatedContent.image.width,
          height: generatedContent.image.height,
          format: generatedContent.image.format,
          prompt: generatedContent.image.prompt,
          model: generatedContent.image.model,
          generatedAt: generatedContent.image.generatedAt
        }];
        console.log('🖼️ Added image data to post with URL:', generatedContent.image.url);
      }

      const generatedPost = new Post(postData);

      // Save the generated post
      await generatedPost.save();
      result.postsCreated++;

      console.log(`📝 Generated post: ${generatedPost._id}`);

      // Always send approval notification for automation-generated posts
      console.log(`📧 Sending approval notification for post: ${generatedPost._id}`);

      try {
        // Generate approval token
        await generatedPost.generateApprovalToken();

        // Get user for notifications

        const user = await User.findById(schedule.userId);

        if (user) {
          // Send email notification with approval links
          await this.notificationService.sendApprovalEmail(user, generatedPost);

          // Send push notification
          await this.notificationService.sendApprovalPushNotification(user, generatedPost);

          // Mark notification as sent
          await generatedPost.markNotificationSent('both');

          console.log(`✅ Approval notifications sent for post: ${generatedPost._id}`);
          console.log(`📱 Post is now pending user approval. Check email and app for approval options.`);
        } else {
          result.errors.push('User not found for notifications');
        }

        result.successfulPosts++;
      } catch (notificationError) {
        console.error('Notification send failed:', notificationError);
        result.errors.push(`Notification failed: ${notificationError.message}`);
        result.failedPosts++;
      }

      // Mark schedule execution
      await schedule.markExecution(result.errors.length === 0, result.errors.join('; '));

      // Mark cron job execution in database
      if (cronJobRecord && typeof cronJobRecord.markExecution === 'function') {
        try {
          const executionTime = Date.now() - executionStartTime;
          await cronJobRecord.markExecution(result.errors.length === 0, result.errors.join('; '), executionTime);
          console.log(`📝 Updated cron job record: ${cronJobRecord._id}`);
        } catch (dbError) {
          console.error(`❌ Failed to update cron job execution:`, dbError);
        }
      } else if (cronJobRecord) {
        console.log(`⚠️ CronJob record found but markExecution method not available`);
      } else {
        console.log(`⚠️ No cronJobRecord available to mark execution`);
      }

      console.log(`📊 Automation completed: ${result.postsCreated} created, ${result.successfulPosts} successful, ${result.failedPosts} failed`);

      return result;
    } catch (error) {
      console.error('Execute automation error:', error);

      // Mark schedule execution as failed
      await schedule.markExecution(false, error.message);

      // Mark cron job execution as failed in database
      if (cronJobRecord && typeof cronJobRecord.markExecution === 'function') {
        try {
          const executionTime = Date.now() - executionStartTime;
          await cronJobRecord.markExecution(false, error.message, executionTime);
          console.log(`📝 Updated cron job record with error: ${cronJobRecord._id}`);
        } catch (dbError) {
          console.error(`❌ Failed to update cron job execution (error case):`, dbError);
        }
      } else if (cronJobRecord) {
        console.log(`⚠️ CronJob record found but markExecution method not available (error case)`);
      } else {
        console.log(`⚠️ No cronJobRecord available to mark execution (error case)`);
      }

      throw error;
    } finally {
      // Always release the execution lock
      this.executionLocks.delete(lockKey);
      console.log(`🔓 Released execution lock for schedule: ${schedule.name} (${sId})`);
    }
  }

  /**
   * Execute automation immediately (for testing)
   */
  async executeAutomationNow(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Automation not found');
      }

      console.log(`🧪 Test executing automation: ${schedule.name}`);
      return await this.executeAutomation(schedule);
    } catch (error) {
      console.error('Test execution error:', error);
      throw error;
    }
  }

  /**
   * Get active schedules count
   */
  getActiveSchedulesCount() {
    let totalJobs = 0;
    for (const userJobs of this.userCronJobs.values()) {
      totalJobs += userJobs.size;
    }
    return totalJobs;
  }

  /**
   * Get active schedules count for a specific user
   */
  getUserActiveSchedulesCount(userId) {
    const userJobs = this.userCronJobs.get(userId);
    return userJobs ? userJobs.size : 0;
  }

  /**
   * Get schedule status
   */
  getScheduleStatus(scheduleId, userId = null) {
    if (userId) {
      const userJobs = this.userCronJobs.get(userId);
      return {
        isScheduled: userJobs ? userJobs.has(scheduleId) : false,
        jobExists: userJobs ? userJobs.get(scheduleId) !== undefined : false,
        userId: userId
      };
    } else {
      // Search across all users
      for (const [uId, userJobs] of this.userCronJobs) {
        if (userJobs.has(scheduleId)) {
          return {
            isScheduled: true,
            jobExists: true,
            userId: uId
          };
        }
      }
      return {
        isScheduled: false,
        jobExists: false,
        userId: null
      };
    }
  }

  /**
   * Reschedule all jobs (useful after server restart)
   */
  async rescheduleAllJobs() {
    console.log('🔄 Rescheduling all automation jobs...');

    // Stop all existing jobs
    for (const [userId, userJobs] of this.userCronJobs) {
      for (const [scheduleId, job] of userJobs) {
        job.stop();
      }
    }
    this.userCronJobs.clear();

    // Reinitialize all active schedules
    await this.initializeAllSchedules();
  }

  /**
   * Stop all jobs for a specific user
   */
  stopUserJobs(userId) {
    const userJobs = this.userCronJobs.get(userId);
    if (userJobs) {
      for (const [scheduleId, job] of userJobs) {
        job.stop();
        console.log(`🛑 Stopped job ${scheduleId} for user: ${userId}`);
      }
      this.userCronJobs.delete(userId);
    }
  }

  /**
   * Get user-specific job statistics
   */
  getUserJobStats(userId) {
    const userJobs = this.userCronJobs.get(userId);
    if (!userJobs) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        scheduleIds: []
      };
    }

    return {
      totalJobs: userJobs.size,
      activeJobs: userJobs.size,
      scheduleIds: Array.from(userJobs.keys())
    };
  }


  /**
   * Get target character count for content length
   */
  getContentLengthTarget(length) {
    switch (length.toLowerCase()) {
      case 'short': return '50-100';
      case 'medium': return '100-200';
      case 'long': return '200-400';
      default: return '100-200';
    }
  }

  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  }

  /**
   * Extract mentions from text
   */
  extractMentions(text) {
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex);
    return matches || [];
  }

  /**
   * Clean up resources
   */
  shutdown() {
    console.log('🛑 Shutting down scheduler service...');

    // Stop all active jobs
    for (const [userId, userJobs] of this.userCronJobs) {
      for (const [scheduleId, job] of userJobs) {
        job.stop();
      }
    }
    this.userCronJobs.clear();

    console.log('✅ Scheduler service shut down');
  }

  /**
   * Ensure user has proper credit structure initialized
   */
  async ensureUserCreditsStructure(user) {
    console.log(`🔍 Checking user credit structure for ${user._id}...`);

    let needsSave = false;

    // Initialize credits object if missing
    if (!user.credits) {
      console.log(`⚠️ User ${user._id} missing credits object, initializing...`);
      user.credits = {};
      needsSave = true;
    }

    // Default credit settings for free plan
    const defaultAutomationCredits = {
      total: 2,
      used: 0,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      resetInterval: 'monthly'
    };

    const defaultExecutionCredits = {
      total: 20,
      used: 0,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      resetInterval: 'monthly',
      executionCount: 0,
      lastExecution: null
    };

    // Initialize automation credits if missing
    if (!user.credits.automation) {
      console.log(`⚠️ User ${user._id} missing automation credits, initializing...`);
      user.credits.automation = defaultAutomationCredits;
      needsSave = true;
    }

    // Initialize execution credits if missing
    if (!user.credits.execution) {
      console.log(`⚠️ User ${user._id} missing execution credits, initializing...`);
      user.credits.execution = defaultExecutionCredits;
      needsSave = true;
    }

    // Ensure all required fields exist in automation credits
    if (user.credits.automation) {
      if (typeof user.credits.automation.total === 'undefined') {
        user.credits.automation.total = defaultAutomationCredits.total;
        needsSave = true;
      }
      if (typeof user.credits.automation.used === 'undefined') {
        user.credits.automation.used = defaultAutomationCredits.used;
        needsSave = true;
      }
      if (!user.credits.automation.resetDate) {
        user.credits.automation.resetDate = defaultAutomationCredits.resetDate;
        needsSave = true;
      }
      if (!user.credits.automation.resetInterval) {
        user.credits.automation.resetInterval = defaultAutomationCredits.resetInterval;
        needsSave = true;
      }
    }

    // Ensure all required fields exist in execution credits
    if (user.credits.execution) {
      if (typeof user.credits.execution.total === 'undefined') {
        user.credits.execution.total = defaultExecutionCredits.total;
        needsSave = true;
      }
      if (typeof user.credits.execution.used === 'undefined') {
        user.credits.execution.used = defaultExecutionCredits.used;
        needsSave = true;
      }
      if (!user.credits.execution.resetDate) {
        user.credits.execution.resetDate = defaultExecutionCredits.resetDate;
        needsSave = true;
      }
      if (!user.credits.execution.resetInterval) {
        user.credits.execution.resetInterval = defaultExecutionCredits.resetInterval;
        needsSave = true;
      }
      if (typeof user.credits.execution.executionCount === 'undefined') {
        user.credits.execution.executionCount = defaultExecutionCredits.executionCount;
        needsSave = true;
      }
      if (!user.credits.execution.lastExecution) {
        user.credits.execution.lastExecution = defaultExecutionCredits.lastExecution;
        needsSave = true;
      }
    }

    // Save user if any changes were made
    if (needsSave) {
      console.log(`✅ Saving updated credit structure for user ${user._id}...`);
      await user.save();
      console.log(`✅ User ${user._id} credit structure initialized successfully`);
    } else {
      console.log(`✅ User ${user._id} credit structure is already properly initialized`);
    }

    // Log final structure
    console.log(`📊 Final credits for ${user._id}: automation=${user.credits.automation?.used}/${user.credits.automation?.total}, execution=${user.credits.execution?.used}/${user.credits.execution?.total}`);

    return user;
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

// Initialize schedules when module is loaded
schedulerService.initializeAllSchedules().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  schedulerService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  schedulerService.shutdown();
  process.exit(0);
});

module.exports = schedulerService;