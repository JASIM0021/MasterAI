const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
require('dotenv').config();

async function diagnoseSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the problematic "test post" schedule
    const testPostSchedule = await Schedule.findOne({
      $or: [
        { name: { $regex: /test post/i } },
        { name: { $regex: /test/i } }
      ]
    });

    if (testPostSchedule) {
      console.log('🔍 Found "test post" schedule:');
      console.log('Name:', testPostSchedule.name);
      console.log('ID:', testPostSchedule._id);
      console.log('Active:', testPostSchedule.isActive);
      console.log('Frequency:', testPostSchedule.recurrence?.frequency);
      console.log('Full recurrence config:', JSON.stringify(testPostSchedule.recurrence, null, 2));

      // Try to generate cron expression
      try {
        let cronExpression = generateCronExpression(testPostSchedule);
        console.log('Generated cron expression:', cronExpression);

        const cron = require('node-cron');
        console.log('Is valid cron?', cron.validate(cronExpression));
      } catch (error) {
        console.error('Error generating cron:', error.message);
      }
    } else {
      console.log('❌ No schedule found with name containing "test"');
    }

    // Also check for any schedules with missing or invalid configurations
    const problemSchedules = await Schedule.find({
      $or: [
        { 'recurrence.frequency': { $exists: false } },
        { 'recurrence.frequency': null },
        { 'recurrence.frequency': '' },
        // Daily without timeSlots
        {
          'recurrence.frequency': 'daily',
          $or: [
            { 'recurrence.timeSlots': { $exists: false } },
            { 'recurrence.timeSlots': { $size: 0 } }
          ]
        },
        // Per-minute without interval
        {
          'recurrence.frequency': 'per-minute',
          $or: [
            { 'recurrence.minuteInterval': { $exists: false } },
            { 'recurrence.minuteInterval': null }
          ]
        }
      ]
    });

    console.log(`\n🔍 Found ${problemSchedules.length} schedules with configuration issues:`);

    problemSchedules.forEach(schedule => {
      console.log(`\n📋 Schedule: "${schedule.name}" (${schedule._id})`);
      console.log(`   Active: ${schedule.isActive}`);
      console.log(`   Frequency: ${schedule.recurrence?.frequency || 'MISSING'}`);

      if (schedule.recurrence?.frequency === 'daily') {
        console.log(`   TimeSlots: ${schedule.recurrence?.timeSlots?.length || 0} slots`);
      } else if (schedule.recurrence?.frequency === 'per-minute') {
        console.log(`   MinuteInterval: ${schedule.recurrence?.minuteInterval || 'MISSING'}`);
      }
    });

    await mongoose.disconnect();
    console.log('\n✅ Diagnosis complete');

  } catch (error) {
    console.error('Error:', error);
  }
}

function generateCronExpression(schedule) {
  let cronExpression;

  switch (schedule.recurrence?.frequency) {
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
    throw new Error(`Unable to generate cron expression for frequency: ${schedule.recurrence?.frequency}`);
  }

  return cronExpression;
}

diagnoseSchedules();