const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Fix schedules with invalid or missing cron configurations
async function fixSchedules() {
  try {
    console.log('🔍 Checking for schedules with invalid configurations...');

    const allSchedules = await Schedule.find({});
    console.log(`Found ${allSchedules.length} total schedules`);

    let fixedCount = 0;
    let disabledCount = 0;

    for (const schedule of allSchedules) {
      let needsUpdate = false;
      let shouldDisable = false;

      console.log(`\n📋 Checking schedule: "${schedule.name}" (${schedule._id})`);
      console.log(`   Frequency: ${schedule.recurrence?.frequency}`);
      console.log(`   Active: ${schedule.isActive}`);

      // Check if recurrence configuration is valid
      if (!schedule.recurrence || !schedule.recurrence.frequency) {
        console.log('   ❌ Missing recurrence configuration');
        shouldDisable = true;
      } else {
        switch (schedule.recurrence.frequency) {
          case 'daily':
            if (!schedule.recurrence.timeSlots || schedule.recurrence.timeSlots.length === 0) {
              console.log('   ❌ Daily schedule missing timeSlots');
              // Add default time slot
              schedule.recurrence.timeSlots = [{ hour: 9, minute: 0 }];
              needsUpdate = true;
              console.log('   ✅ Added default timeSlot: 9:00 AM');
            }
            break;

          case 'weekly':
            if (!schedule.recurrence.daysOfWeek || schedule.recurrence.daysOfWeek.length === 0 ||
                !schedule.recurrence.timeSlots || schedule.recurrence.timeSlots.length === 0) {
              console.log('   ❌ Weekly schedule missing daysOfWeek or timeSlots');
              // Add default configuration
              schedule.recurrence.daysOfWeek = [1]; // Monday
              schedule.recurrence.timeSlots = [{ hour: 9, minute: 0 }];
              needsUpdate = true;
              console.log('   ✅ Added default weekly config: Monday 9:00 AM');
            }
            break;

          case 'monthly':
            if (!schedule.recurrence.dayOfMonth ||
                !schedule.recurrence.timeSlots || schedule.recurrence.timeSlots.length === 0) {
              console.log('   ❌ Monthly schedule missing dayOfMonth or timeSlots');
              // Add default configuration
              schedule.recurrence.dayOfMonth = 1;
              schedule.recurrence.timeSlots = [{ hour: 9, minute: 0 }];
              needsUpdate = true;
              console.log('   ✅ Added default monthly config: 1st day, 9:00 AM');
            }
            break;

          case 'per-minute':
            if (!schedule.recurrence.minuteInterval) {
              console.log('   ❌ Per-minute schedule missing minuteInterval');
              // Add default interval
              schedule.recurrence.minuteInterval = 5;
              needsUpdate = true;
              console.log('   ✅ Added default minuteInterval: 5 minutes');
            }
            break;

          case 'custom':
            if (!schedule.recurrence.cronExpression) {
              console.log('   ❌ Custom schedule missing cronExpression');
              shouldDisable = true;
            }
            break;

          default:
            console.log(`   ❌ Unknown frequency: ${schedule.recurrence.frequency}`);
            shouldDisable = true;
        }
      }

      // Update or disable the schedule
      if (shouldDisable) {
        schedule.isActive = false;
        schedule.lastError = 'Invalid schedule configuration - disabled automatically';
        await schedule.save();
        disabledCount++;
        console.log('   🚫 Schedule disabled due to invalid configuration');
      } else if (needsUpdate) {
        // Recalculate next execution
        schedule.calculateNextExecution();
        await schedule.save();
        fixedCount++;
        console.log('   ✅ Schedule configuration fixed');
      } else {
        console.log('   ✅ Schedule configuration is valid');
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Fixed: ${fixedCount} schedules`);
    console.log(`   Disabled: ${disabledCount} schedules`);
    console.log(`   Total processed: ${allSchedules.length} schedules`);

  } catch (error) {
    console.error('Error fixing schedules:', error);
  }
}

// Test cron expression generation for existing schedules
async function testCronGeneration() {
  console.log('\n🧪 Testing cron expression generation...');

  const activeSchedules = await Schedule.find({ isActive: true });

  for (const schedule of activeSchedules) {
    console.log(`\nTesting: "${schedule.name}"`);
    console.log(`Frequency: ${schedule.recurrence?.frequency}`);

    try {
      let cronExpression = generateCronExpression(schedule);
      console.log(`Generated cron: ${cronExpression}`);

      const cron = require('node-cron');
      if (cron.validate(cronExpression)) {
        console.log('✅ Valid cron expression');
      } else {
        console.log('❌ Invalid cron expression');
      }
    } catch (error) {
      console.log(`❌ Error generating cron: ${error.message}`);
    }
  }
}

// Helper function to generate cron expression (same logic as scheduler service)
function generateCronExpression(schedule) {
  let cronExpression;

  switch (schedule.recurrence.frequency) {
    case 'daily':
      if (schedule.recurrence.timeSlots && schedule.recurrence.timeSlots.length > 0) {
        const slot = schedule.recurrence.timeSlots[0];
        cronExpression = `${slot.minute} ${slot.hour} * * *`;
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
      if (schedule.recurrence.minuteInterval) {
        const interval = Math.max(1, Math.min(30, schedule.recurrence.minuteInterval));
        cronExpression = `*/${interval} * * * *`;
      } else {
        cronExpression = '*/5 * * * *';
      }
      break;

    case 'custom':
      cronExpression = schedule.recurrence.cronExpression;
      break;
  }

  if (!cronExpression) {
    cronExpression = '0 * * * *'; // Hourly fallback
  }

  return cronExpression;
}

// Main execution
async function main() {
  await connectDB();

  console.log('🛠️  Schedule Fix Utility');
  console.log('======================');

  await fixSchedules();
  await testCronGeneration();

  console.log('\n✅ Done! You can now restart your server.');
  process.exit(0);
}

main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});