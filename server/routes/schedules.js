const express = require('express');
const cron = require('node-cron');

// Import models
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Post = require('../models/Post');

const { verifyToken } = require('./auth');
const schedulerService = require('../services/schedulerService');


const router = express.Router();





// CREATE SCHEDULE
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      recurrence,
      content,
      targetPlatforms,
      limits
    } = req.body;

    // Validate required fields
    if (!name || !recurrence || !content || !targetPlatforms) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, recurrence, content, targetPlatforms'
      });
    }

    // Check user's automation credits
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has available automation credits
    if (!(await user.hasAutomationCredits())) {
      const creditInfo = await user.getCreditInfo();
      return res.status(403).json({
        success: false,
        message: 'Insufficient automation credits. You have used all your automation slots.',
        creditInfo: {
          total: creditInfo.total,
          used: creditInfo.used,
          available: creditInfo.available,
          resetDate: creditInfo.resetDate
        }
      });
    }

    // Validate target platforms
    const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
    const validatedPlatforms = [];

    for (const platform of targetPlatforms) {
      // Simple validation - just check platform name is valid
      if (!validPlatforms.includes(platform.platform.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Unsupported platform: ${platform.platform}. Supported platforms: ${validPlatforms.join(', ')}`
        });
      }

      validatedPlatforms.push({
        platform: platform.platform.toLowerCase(),
        accountId: platform.accountId || `${platform.platform.toLowerCase()}_user`,
        accountName: platform.accountName || `${platform.platform} Account`,
        isActive: true
      });
    }

    // Create schedule
    const newSchedule = new Schedule({
      userId: req.user._id,
      name: name.trim(),
      description: description?.trim() || '',
      type: type || 'recurring',
      recurrence: {
        frequency: recurrence.frequency,
        daysOfWeek: recurrence.daysOfWeek || [],
        dayOfMonth: recurrence.dayOfMonth || null,
        timeSlots: recurrence.timeSlots || [],
        timezone: recurrence.timezone || 'UTC',
        cronExpression: recurrence.cronExpression || null
      },
      content: {
        type: content.type || 'template',
        template: content.template || null,
        aiConfig: content.aiConfig || {},
        contentPool: content.contentPool || [],
        rotation: content.rotation || 'sequential'
      },
      targetPlatforms: validatedPlatforms,
      limits: {
        maxExecutions: limits?.maxExecutions || null,
        endDate: limits?.endDate ? new Date(limits.endDate) : null
      }
    });

    // Calculate next execution time
    await newSchedule.calculateNextExecution();
    await newSchedule.save();

    // Consume automation credit after successful schedule creation
    await user.consumeAutomationCredit();

    // Schedule the cron job
    if (newSchedule.isActive) {
      await schedulerService.scheduleJob(newSchedule);
    }

    // Get updated credit info
    const updatedCreditInfo = await user.getCreditInfo();

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule: {
        id: newSchedule._id,
        name: newSchedule.name,
        description: newSchedule.description,
        type: newSchedule.type,
        recurrence: newSchedule.recurrence,
        content: newSchedule.content,
        targetPlatforms: newSchedule.targetPlatforms,
        isActive: newSchedule.isActive,
        nextExecution: newSchedule.nextExecution,
        createdAt: newSchedule.createdAt
      },
      creditInfo: {
        total: updatedCreditInfo.total,
        used: updatedCreditInfo.used,
        available: updatedCreditInfo.available,
        resetDate: updatedCreditInfo.resetDate
      }
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule'
    });
  }
});

// GET SCHEDULES
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      status,
      platform,
      frequency,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { userId: req.user._id };

    // Add filters
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (platform) {
      query['targetPlatforms.platform'] = platform;
    }
    if (frequency) {
      query['recurrence.frequency'] = frequency;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const schedules = await Schedule.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const totalSchedules = await Schedule.countDocuments(query);

    res.json({
      success: true,
      schedules: schedules.map(schedule => ({
        id: schedule._id,
        name: schedule.name,
        description: schedule.description,
        type: schedule.type,
        recurrence: {
          frequency: schedule.recurrence.frequency,
          daysOfWeek: schedule.recurrence.daysOfWeek,
          timeSlots: schedule.recurrence.timeSlots,
          timezone: schedule.recurrence.timezone
        },
        content: {
          type: schedule.content.type,
          template: schedule.content.template
        },
        targetPlatforms: schedule.targetPlatforms.map(p => ({
          platform: p.platform,
          accountName: p.accountName,
          isActive: p.isActive
        })),
        isActive: schedule.isActive,
        nextExecution: schedule.nextExecution,
        lastExecution: schedule.lastExecution,
        stats: schedule.stats,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalSchedules / limit),
        totalSchedules,
        hasNext: page * limit < totalSchedules,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules'
    });
  }
});

// GET SINGLE SCHEDULE
router.get('/:scheduleId', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      schedule: {
        id: schedule._id,
        name: schedule.name,
        description: schedule.description,
        type: schedule.type,
        recurrence: schedule.recurrence,
        content: schedule.content,
        targetPlatforms: schedule.targetPlatforms,
        isActive: schedule.isActive,
        limits: schedule.limits,
        nextExecution: schedule.nextExecution,
        lastExecution: schedule.lastExecution,
        stats: schedule.stats,
        lastError: schedule.lastError,
        errorCount: schedule.errorCount,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule'
    });
  }
});

// UPDATE SCHEDULE
router.put('/:scheduleId', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const {
      name,
      description,
      recurrence,
      content,
      targetPlatforms,
      limits,
      isActive
    } = req.body;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Update fields if provided
    if (name !== undefined) schedule.name = name.trim();
    if (description !== undefined) schedule.description = description.trim();
    if (recurrence !== undefined) schedule.recurrence = { ...schedule.recurrence, ...recurrence };
    if (content !== undefined) schedule.content = { ...schedule.content, ...content };
    if (limits !== undefined) schedule.limits = { ...schedule.limits, ...limits };

    // Update target platforms if provided
    if (targetPlatforms !== undefined) {
      const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
      const validatedPlatforms = [];

      for (const platform of targetPlatforms) {
        // Simple validation - just check platform name is valid
        if (!validPlatforms.includes(platform.platform.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `Unsupported platform: ${platform.platform}. Supported platforms: ${validPlatforms.join(', ')}`
          });
        }

        validatedPlatforms.push({
          platform: platform.platform.toLowerCase(),
          accountId: platform.accountId || `${platform.platform.toLowerCase()}_user`,
          accountName: platform.accountName || `${platform.platform} Account`,
          isActive: platform.isActive !== undefined ? platform.isActive : true
        });
      }
      schedule.targetPlatforms = validatedPlatforms;
    }

    // Handle activation/deactivation
    if (isActive !== undefined && isActive !== schedule.isActive) {
      schedule.isActive = isActive;

      if (isActive) {
        await schedulerService.scheduleJob(schedule);
      } else {
        await schedulerService.stopJob(schedule._id.toString(), req.user._id);
      }
    }

    // Recalculate next execution if schedule details changed
    if (recurrence !== undefined) {
      await schedule.calculateNextExecution();
    }

    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: {
        id: schedule._id,
        name: schedule.name,
        isActive: schedule.isActive,
        nextExecution: schedule.nextExecution,
        updatedAt: schedule.updatedAt
      }
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
});

// DELETE SCHEDULE
router.delete('/:scheduleId', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Stop the cron job with enhanced verification
    const stopResult = await schedulerService.stopJob(scheduleId, req.user._id);
    console.log(`🛑 Stop job result for schedule ${scheduleId}:`, stopResult);

    // Verify cron job was properly stopped
    if (!stopResult.success) {
      console.warn(`⚠️ Cron job stop had issues for schedule ${scheduleId}, but proceeding with deletion`);
    }

    // Delete the schedule
    await Schedule.findByIdAndDelete(scheduleId);

    // Restore automation credit to user
    const user = await User.findById(req.user._id);
    if (user) {
      await user.restoreAutomationCredit();
    }

    // Get updated credit info
    const updatedCreditInfo = user ? await user.getCreditInfo() : null;

    res.json({
      success: true,
      message: 'Schedule deleted successfully',
      cronJobStopped: stopResult.success,
      stopDetails: {
        jobStopped: stopResult.jobStopped,
        dbUpdated: stopResult.dbUpdated,
        errors: stopResult.errors,
        duration: stopResult.duration
      },
      creditInfo: updatedCreditInfo ? {
        total: updatedCreditInfo.total,
        used: updatedCreditInfo.used,
        available: updatedCreditInfo.available,
        resetDate: updatedCreditInfo.resetDate
      } : null
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule'
    });
  }
});

// DUPLICATE SCHEDULE
router.post('/:scheduleId/duplicate', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    // Find the original schedule
    const originalSchedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!originalSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check if user has enough automation credits
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasCredits = await user.hasAutomationCredits();
    if (!hasCredits) {
      const availableCredits = await user.getAvailableAutomationCredits();
      return res.status(402).json({
        success: false,
        message: `Insufficient automation credits. Available: ${availableCredits}`,
        errorCode: 'INSUFFICIENT_CREDITS',
        creditsAvailable: availableCredits
      });
    }

    // Create a copy of the original schedule with modifications
    const duplicateData = {
      userId: req.user._id,
      name: `${originalSchedule.name} (Copy)`,
      description: originalSchedule.description ? `${originalSchedule.description} (Duplicated)` : 'Duplicated automation workflow',
      type: originalSchedule.type,
      recurrence: {
        ...originalSchedule.recurrence.toObject()
      },
      content: {
        ...originalSchedule.content.toObject()
      },
      targetPlatforms: originalSchedule.targetPlatforms ? [...originalSchedule.targetPlatforms] : [],
      limits: originalSchedule.limits ? { ...originalSchedule.limits.toObject() } : {},
      isActive: false, // Start duplicated workflows as inactive
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageEngagement: 0
      },
      lastExecution: null,
      nextExecution: null, // Will be calculated if activated
      lastError: null,
      errorCount: 0
    };

    // Create the new schedule
    const newSchedule = new Schedule(duplicateData);

    // If the duplicate is set to active, calculate next execution
    if (newSchedule.isActive) {
      await newSchedule.calculateNextExecution();
    }

    await newSchedule.save();

    // Consume automation credit
    await user.consumeAutomationCredit();

    // If the schedule is active, schedule the cron job
    if (newSchedule.isActive) {
      try {
        await schedulerService.scheduleJob(newSchedule);
      } catch (schedulingError) {
        console.error('Error scheduling duplicated job:', schedulingError);
        // Don't fail the duplication, just log the error
        newSchedule.lastError = `Failed to schedule: ${schedulingError.message}`;
        await newSchedule.save();
      }
    }

    // Get updated credit info
    const updatedCreditInfo = await user.getCreditInfo();

    res.json({
      success: true,
      message: 'Schedule duplicated successfully',
      schedule: {
        id: newSchedule._id,
        name: newSchedule.name,
        description: newSchedule.description,
        type: newSchedule.type,
        recurrence: newSchedule.recurrence,
        content: newSchedule.content,
        targetPlatforms: newSchedule.targetPlatforms,
        limits: newSchedule.limits,
        isActive: newSchedule.isActive,
        nextExecution: newSchedule.nextExecution,
        stats: newSchedule.stats,
        createdAt: newSchedule.createdAt
      },
      originalScheduleId: scheduleId,
      creditInfo: updatedCreditInfo ? {
        total: updatedCreditInfo.total,
        used: updatedCreditInfo.used,
        available: updatedCreditInfo.available,
        resetDate: updatedCreditInfo.resetDate
      } : null
    });

  } catch (error) {
    console.error('Duplicate schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// TOGGLE SCHEDULE STATUS
router.post('/:scheduleId/toggle', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.isActive = !schedule.isActive;

    if (schedule.isActive) {
      await schedule.calculateNextExecution();
      await schedulerService.scheduleJob(schedule);
    } else {
      await schedulerService.stopJob(scheduleId, req.user._id);
    }

    await schedule.save();

    res.json({
      success: true,
      message: `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully`,
      schedule: {
        id: schedule._id,
        name: schedule.name,
        isActive: schedule.isActive,
        nextExecution: schedule.nextExecution
      }
    });
  } catch (error) {
    console.error('Toggle schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle schedule'
    });
  }
});

// TEST SCHEDULE (Execute once immediately)
router.post('/:scheduleId/test', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Execute the schedule once
    const result = await schedulerService.executeAutomationNow(schedule._id);

    res.json({
      success: true,
      message: 'Schedule test executed successfully',
      result: {
        postsCreated: result.postsCreated,
        successfulPosts: result.successfulPosts,
        failedPosts: result.failedPosts,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Test schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute schedule test'
    });
  }
});

// GET SCHEDULE ANALYTICS
router.get('/:scheduleId/analytics', verifyToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { dateRange = '30d' } = req.query;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get posts created by this schedule
    const posts = await Post.find({
      'scheduling.automationRuleId': scheduleId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate analytics
    const analytics = {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'published').length,
      failedPosts: posts.filter(p => p.status === 'failed').length,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
      totalEngagement: posts.reduce((sum, post) => sum + (post.totalEngagement || 0), 0),
      averageEngagement: 0,
      platformBreakdown: {},
      dailyStats: []
    };

    if (analytics.publishedPosts > 0) {
      analytics.averageEngagement = analytics.totalEngagement / analytics.publishedPosts;
    }

    // Platform breakdown
    posts.forEach(post => {
      post.targetPlatforms.forEach(platform => {
        if (!analytics.platformBreakdown[platform.platform]) {
          analytics.platformBreakdown[platform.platform] = {
            total: 0,
            published: 0,
            failed: 0,
            engagement: 0
          };
        }

        analytics.platformBreakdown[platform.platform].total++;
        if (platform.status === 'published') {
          analytics.platformBreakdown[platform.platform].published++;
          analytics.platformBreakdown[platform.platform].engagement +=
            (platform.metrics?.likes || 0) + (platform.metrics?.shares || 0) + (platform.metrics?.comments || 0);
        } else if (platform.status === 'failed') {
          analytics.platformBreakdown[platform.platform].failed++;
        }
      });
    });

    res.json({
      success: true,
      analytics,
      schedule: {
        id: schedule._id,
        name: schedule.name,
        stats: schedule.stats
      }
    });
  } catch (error) {
    console.error('Get schedule analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule analytics'
    });
  }
});

// GET USER CREDIT INFORMATION
router.get('/credits', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const creditInfo = await user.getCreditInfo();

    res.json({
      success: true,
      credits: {
        automation: {
          total: creditInfo.total,
          used: creditInfo.used,
          available: creditInfo.available,
          resetDate: creditInfo.resetDate,
          resetInterval: creditInfo.resetInterval,
          executionCount: creditInfo.executionCount,
          lastExecution: creditInfo.lastExecution
        }
      }
    });
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit information'
    });
  }
});






// Helper function to generate content from template
async function generateFromTemplate(schedule) {
  const template = schedule.content.template;
  if (!template) return null;

  // Simple template processing - replace variables
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  let text = template
    .replace(/\{date\}/g, currentDate)
    .replace(/\{time\}/g, currentTime)
    .replace(/\{day\}/g, new Date().toLocaleDateString('en-US', { weekday: 'long' }))
    .replace(/\{month\}/g, new Date().toLocaleDateString('en-US', { month: 'long' }));

  return {
    text,
    hashtags: extractHashtags(text),
    mentions: extractMentions(text)
  };
}

// Helper function to generate content with AI
async function generateWithAI(schedule) {
  try {
    const aiConfig = schedule.content.aiConfig;
    if (!aiConfig.topic) return null;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate a ${aiConfig.contentLength || 'medium'} social media post about ${aiConfig.topic}
      with a ${aiConfig.tone || 'professional'} tone.
      ${aiConfig.keywords && aiConfig.keywords.length > 0 ? `Include these keywords: ${aiConfig.keywords.join(', ')}` : ''}
      ${aiConfig.includeHashtags ? `Include ${aiConfig.maxHashtags || 5} relevant hashtags.` : 'Do not include hashtags.'}
      Make it engaging and suitable for multiple social media platforms.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return {
      text,
      hashtags: aiConfig.includeHashtags ? extractHashtags(text) : [],
      mentions: extractMentions(text)
    };
  } catch (error) {
    console.error('AI content generation error:', error);
    return null;
  }
}

// Helper function to get content from predefined pool
async function getFromContentPool(schedule) {
  const contentPool = schedule.content.contentPool;
  if (!contentPool || contentPool.length === 0) return null;

  let selectedContent;

  switch (schedule.content.rotation) {
    case 'sequential':
      // Find first unused content or reset if all used
      selectedContent = contentPool.find(c => !c.used);
      if (!selectedContent) {
        // Reset all and take first
        contentPool.forEach(c => c.used = false);
        selectedContent = contentPool[0];
      }
      break;

    case 'random':
      selectedContent = contentPool[Math.floor(Math.random() * contentPool.length)];
      break;

    case 'weighted':
      // Simple implementation - could be enhanced with actual weights
      selectedContent = contentPool[Math.floor(Math.random() * contentPool.length)];
      break;

    default:
      selectedContent = contentPool[0];
  }

  if (selectedContent) {
    selectedContent.used = true;
    selectedContent.lastUsed = new Date();
    await schedule.save();

    return {
      text: selectedContent.text,
      hashtags: extractHashtags(selectedContent.text),
      mentions: extractMentions(selectedContent.text)
    };
  }

  return null;
}

// Helper functions
function extractHashtags(text) {
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches || [];
}

function extractMentions(text) {
  const mentionRegex = /@[\w]+/g;
  const matches = text.match(mentionRegex);
  return matches || [];
}

// Import publishPost function from posts route
// This would need to be refactored to avoid circular dependencies
async function publishPost(post) {
  // Simplified version - in practice, this should be imported from a shared service
  post.status = 'published';
  await post.save();
}

// Initialize existing schedules on server startup
async function initializeSchedules() {
  try {
    const activeSchedules = await Schedule.find({ isActive: true });

    // const scduleService = new schedulerService()
    for (const schedule of activeSchedules) {
      await schedulerService.scheduleJob(schedule);
    }

    console.log(`Initialized ${activeSchedules.length} active schedules`);
  } catch (error) {
    console.error('Error initializing schedules:', error);
  }
}

// Call initialization
initializeSchedules();

module.exports = router;