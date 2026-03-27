const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Models
const User = require('../models/User');
const Credit = require('../models/Credit');
const VideoTemplate = require('../models/VideoTemplate');
const GeneratedVideo = require('../models/GeneratedVideo');
const UserFavorites = require('../models/UserFavorites');

// Services
const { veo3Service } = require('../services/veo3Service');
const { videoProcessingService } = require('../services/videoProcessingService');
const { templateService } = require('../services/templateService');
const jsonTemplateService = require('../services/jsonTemplateService');
const { uploadBase64Image } = require('../services/cloudinaryService');

// Auth middleware
const { verifyToken } = require('./auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/user-images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `user-image-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for user images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.subscription?.plan !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ================= VIDEO GENERATION ENDPOINTS =================

/**
 * POST /api/videos/calculate-cost
 * Calculate credit cost for video generation
 */
router.post('/calculate-cost', verifyToken, async (req, res) => {
  try {
    const { duration = 8, model = 'fast' } = req.body;

    // Validate inputs
    const validDurations = [4, 6, 8];
    const validModels = ['fast', 'standard'];

    if (!validDurations.includes(duration)) {
      return res.status(400).json({
        success: false,
        message: `Invalid duration. Must be one of: ${validDurations.join(', ')} seconds`
      });
    }

    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        message: `Invalid model. Must be one of: ${validModels.join(', ')}`
      });
    }

    // Calculate cost
    const creditCost = veo3Service.calculateCreditCost({ duration, model });
    const estimatedTimes = veo3Service.getEstimatedTimes(model);

    res.json({
      success: true,
      cost: {
        duration,
        model,
        baseCost: duration * 3,
        modelMultiplier: model === 'standard' ? 1.5 : 1,
        totalCost: creditCost
      },
      estimatedTime: estimatedTimes,
      breakdown: {
        message: `${duration} seconds × 3 credits/second ${model === 'standard' ? '× 1.5 (standard model premium)' : ''} = ${creditCost} credits`,
        formula: model === 'standard' ? 'duration × 3 × 1.5' : 'duration × 3'
      }
    });

  } catch (error) {
    console.error('❌ Cost calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate cost',
      error: error.message
    });
  }
});

/**
 * POST /api/videos/generate
 * Generate a new video using AI
 */
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      prompt,
      templateId = null,
      userImageBase64 = null,
      config = {}
    } = req.body;

    console.log(`🎬 Video generation request from user ${userId}`);
    console.log(`📝 Prompt: ${prompt?.substring(0, 100)}...`);

    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    // Set up video configuration with defaults
    const videoConfig = {
      duration: config.duration || 8,
      aspectRatio: config.aspectRatio || '16:9',
      resolution: config.resolution || '720p',
      model: config.model || 'fast', // 'fast' or 'standard'
      ...config
    };

    // Calculate credit cost based on duration and model
    const videoCost = veo3Service.calculateCreditCost({
      duration: videoConfig.duration,
      model: videoConfig.model
    });

    // Check user credits before generation
    const credit = await Credit.findOrCreateForUser(userId);

    if (!credit.canUseGlobalService('videoGeneration', videoCost)) {
      return res.status(402).json({
        success: false,
        message: `Insufficient credits. Video generation costs ${videoCost} credits.`,
        errorCode: 'INSUFFICIENT_CREDITS',
        creditsNeeded: videoCost,
        creditsAvailable: credit.globalCredits.balance,
        costBreakdown: {
          duration: videoConfig.duration,
          baseCost: videoConfig.duration * 3,
          model: videoConfig.model,
          modelMultiplier: videoConfig.model === 'standard' ? 1.5 : 1,
          totalCost: videoCost
        }
      });
    }

    // Deduct credits upfront to prevent multiple simultaneous generations
    try {
      await credit.deductGlobalCredits('videoGeneration', videoCost);
      console.log(`💰 Credits deducted upfront: ${videoCost} credits for user ${userId}`);
    } catch (creditError) {
      console.error('❌ Failed to deduct credits upfront:', creditError);
      return res.status(402).json({
        success: false,
        message: 'Failed to process credit deduction. Please try again.',
        errorCode: 'CREDIT_DEDUCTION_FAILED'
      });
    }

    // Determine generation type
    let generationType = 'custom_prompt';
    if (templateId && userImageBase64) {
      generationType = 'template_with_photo';
    } else if (templateId) {
      generationType = 'template';
    }

    // Process user image if provided
    let userImageUrl = null;
    if (userImageBase64) {
      try {
        const imageResult = await uploadBase64Image(userImageBase64, {
          folder: 'user-uploads',
          transformation: [
            { width: 1024, height: 1024, crop: 'limit' },
            { quality: 'auto', format: 'auto' }
          ]
        });
        userImageUrl = imageResult.url;
        console.log('📸 User image uploaded successfully');
      } catch (error) {
        console.error('❌ Failed to upload user image:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to process user image'
        });
      }
    }

    // Get template if specified
    let template = null;
    let finalPrompt = prompt;
    if (templateId) {
      template = await jsonTemplateService.getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Use template prompt with user photo integration
      if (userImageUrl && template.supportsUserPhoto) {
        finalPrompt = jsonTemplateService.getProcessedPrompt(template, 'user provided image');
      } else {
        finalPrompt = jsonTemplateService.getProcessedPrompt(template);
      }

      // Record template usage (JSON mode - not persisted but logged)
      await jsonTemplateService.incrementUsage(templateId);
    }

    // Validate resolution/duration combination (1080p requires 8s duration)
    if (videoConfig.resolution === '1080p' && videoConfig.duration !== 8) {
      return res.status(400).json({
        success: false,
        message: '1080p resolution requires 8-second duration'
      });
    }

    // Create GeneratedVideo record
    const generatedVideo = new GeneratedVideo({
      userId,
      templateId: templateId || null, // Allow null for JSON templates since they use string IDs
      generationType,
      prompt: {
        original: prompt,
        processed: finalPrompt
      },
      userImage: userImageUrl ? {
        url: userImageUrl,
        uploadedAt: new Date()
      } : undefined,
      config: videoConfig,
      creditCost: videoCost,
      status: 'pending',
      // Store template metadata for JSON templates
      templateMetadata: template ? {
        id: template.id,
        name: template.name,
        category: template.category
      } : undefined
    });

    await generatedVideo.save();

    // Get user for notifications
    const user = await User.findById(userId);

    // Initialize push notification service
    const PushNotificationService = require('../services/pushNotificationService');
    const pushService = new PushNotificationService();

    // Start async video generation with Firebase notifications
    setImmediate(async () => {
      try {
        console.log('🚀 Starting async video generation with Firebase notifications...');

        // Send start notification
        if (pushService.isReady()) {
          await pushService.sendVideoGenerationStarted(user, generatedVideo);
        }

        // Update status to processing
        generatedVideo.status = 'processing';
        await generatedVideo.save();

        // Progress callback for notifications
        const progressCallback = async (progress, status) => {
          if (pushService.isReady() && progress > 0 && progress % 25 === 0) {
            await pushService.sendVideoGenerationProgress(user, generatedVideo, progress, status);
          }
        };

        const generationResult = await veo3Service.generateVideoComplete({
          prompt: finalPrompt,
          aspectRatio: videoConfig.aspectRatio,
          duration: videoConfig.duration,
          resolution: videoConfig.resolution,
          model: videoConfig.model,
          userId,
          userImageBase64: userImageBase64,
          progressCallback
        });

        // Update video record with completed video details
        await generatedVideo.markAsCompleted({
          url: generationResult.video.url,
          publicId: generationResult.video.publicId,
          duration: generationResult.video.duration,
          size: generationResult.video.size,
          format: generationResult.video.format,
          resolution: {
            width: generationResult.video.resolution.width,
            height: generationResult.video.resolution.height
          }
        });

        // Update thumbnail
        if (generationResult.thumbnail) {
          generatedVideo.thumbnail = {
            url: generationResult.thumbnail.url,
            publicId: generationResult.thumbnail.publicId
          };
        }

        // Store processing metadata while preserving existing metadata
        generatedVideo.metadata = {
          userAgent: generatedVideo.metadata?.userAgent || null,
          ipAddress: generatedVideo.metadata?.ipAddress || null,
          deviceInfo: generatedVideo.metadata?.deviceInfo || {
            platform: 'unknown',
            os: 'unknown',
            version: 'unknown'
          },
          model: generationResult.config.model,
          processingTimeMs: generationResult.processingTimeMs,
          completedAt: generationResult.completedAt
        };

        // Mark credits as deducted (already deducted upfront)
        generatedVideo.creditDeducted = true;
        generatedVideo.creditDeductedAt = new Date();
        await generatedVideo.save();

        console.log(`💰 Credits already deducted upfront for video ${generatedVideo._id}`);

        // Send completion notification
        if (pushService.isReady()) {
          await pushService.sendVideoGenerationCompleted(user, generatedVideo);
        }

        console.log(`✅ Async video generation completed successfully in ${Math.round(generationResult.processingTimeMs / 1000)}s`);

      } catch (generationError) {
        console.error('❌ Async video generation failed:', generationError);

        // Check if this was a content filtering issue
        const isContentFiltered = generationError.message && generationError.message.includes('Content filtered');

        if (isContentFiltered) {
          console.log('🔄 Content was filtered, refunding credits...');

          // Refund credits for filtered content (Google doesn't charge for filtered content)
          try {
            await Credit.create({
              userId: user._id,
              credits: creditCost,
              type: 'refund',
              description: `Refund for filtered video content: ${generatedVideo._id}`
            });
            console.log(`✅ Refunded ${creditCost} credits for filtered content`);
          } catch (refundError) {
            console.error('❌ Failed to refund credits:', refundError);
          }

          // Mark video as failed with specific reason
          await generatedVideo.markAsFailed({
            message: generationError.message,
            code: 'CONTENT_FILTERED'
          });
        } else {
          // Refund credits for failed generation (non-content filtered)
          try {
            await Credit.create({
              userId: generatedVideo.userId,
              type: 'refund',
              reason: 'Video generation failed',
              amount: generatedVideo.creditCost,
              balanceAfter: credit.globalCredits.balance + generatedVideo.creditCost,
              transactionDate: new Date(),
              metadata: {
                videoId: generatedVideo._id,
                originalError: generationError.message,
                refundReason: 'GENERATION_FAILED'
              }
            });

            credit.globalCredits.balance += generatedVideo.creditCost;
            await credit.save();
            console.log(`💰 Credits refunded (${generatedVideo.creditCost}) for failed generation: ${generatedVideo._id}`);
          } catch (refundError) {
            console.error('❌ Failed to refund credits for failed generation:', refundError);
          }

          // Mark video as failed for other reasons
          await generatedVideo.markAsFailed({
            message: generationError.message,
            code: 'GENERATION_FAILED'
          });
        }

        // Send failure notification
        if (pushService.isReady()) {
          await pushService.sendVideoGenerationFailed(user, generatedVideo, generationError);
        }
      }
    });

    // Return immediate response
    const estimatedTimes = veo3Service.getEstimatedTimes(videoConfig.model);

    res.status(202).json({
      success: true,
      message: 'Video generation started successfully',
      video: {
        id: generatedVideo._id,
        status: 'pending',
        prompt: finalPrompt,
        config: videoConfig,
        creditCost: videoCost,
        estimatedTime: estimatedTimes,
        generationType,
        template: template ? {
          id: template.id,
          name: template.name,
          category: template.category,
          supportsUserPhoto: template.supportsUserPhoto
        } : null,
        createdAt: generatedVideo.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Video generation endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/videos/status/:videoId
 * Check the status of a video generation
 */
router.get('/status/:videoId', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { videoId } = req.params;

    console.log(`🔍 Checking video status ${videoId} for user ${userId}`);

    // Get video record
    const video = await GeneratedVideo.findOne({
      _id: videoId,
      userId
    }).populate('templateId', 'name category thumbnail');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // If video is still processing, check external operation status
    if (video.status === 'processing' && video.externalJobId) {
      try {
        const jobStatus = await veo3Service.checkJobStatus(video.externalJobId);

        if (jobStatus.status === 'completed') {
          try {
            // Try to process the completed video through Cloudinary
            const processedVideo = await videoProcessingService.processGeneratedVideo(
              jobStatus.video.url,
              {
                userId,
                jobId: video.externalJobId,
                prompt: video.prompt.original,
                aspectRatio: video.config.aspectRatio
              }
            );

            // Update video record with processed video
            await video.markAsCompleted({
              url: processedVideo.video.url,
              publicId: processedVideo.video.publicId,
              duration: processedVideo.video.duration,
              size: processedVideo.video.size,
              format: processedVideo.video.format,
              resolution: {
                width: processedVideo.video.width,
                height: processedVideo.video.height
              }
            });

            // Update thumbnail
            video.thumbnail = {
              url: processedVideo.thumbnail.url,
              publicId: processedVideo.thumbnail.publicId || `${processedVideo.video.publicId}_thumb`
            };
            await video.save();

            console.log('✅ Video processed and uploaded to Cloudinary successfully');

          } catch (processingError) {
            console.warn('⚠️ Failed to process video through Cloudinary, using direct Veo 3.1 URL:', processingError.message);

            // Fallback: Store the Veo 3.1 URL directly
            await video.markAsCompleted({
              url: jobStatus.video.url, // Direct Veo 3.1 URL
              publicId: `veo3_${video.externalJobId}`, // Generate a placeholder public ID
              duration: jobStatus.video.duration || 8,
              size: 0, // Unknown size
              format: 'mp4',
              resolution: jobStatus.video.resolution || { width: 1280, height: 720 }
            });

            // No thumbnail for direct Veo URLs
            video.thumbnail = {
              url: null,
              publicId: null
            };
            await video.save();

            console.log('✅ Video marked as completed with direct Veo 3.1 URL');
          }

          // Deduct credits only on successful completion
          try {
            await video.deductCredits();
            console.log(`💰 Credits deducted successfully for video ${videoId}`);
          } catch (creditError) {
            console.error('❌ Failed to deduct credits:', creditError);
            // Don't fail the whole operation, but log the error
          }

          // Update user favorites stats
          try {
            const userFavorites = await UserFavorites.findOrCreateForUser(userId);
            await userFavorites.incrementVideoGenerated(video.creditCost);
          } catch (statsError) {
            console.error('❌ Failed to update user stats:', statsError);
          }

        } else if (jobStatus.status === 'failed') {
          // Mark video as failed
          await video.markAsFailed({
            message: jobStatus.error?.message || 'External generation failed',
            code: jobStatus.error?.code || 'EXTERNAL_GENERATION_FAILED'
          });
        } else {
          // Update progress
          await video.updateProgress(jobStatus.progress || 0);
        }

      } catch (statusError) {
        console.error('❌ Failed to check job status:', statusError);
        // Don't update the video status, will be checked again later
      }
    }

    // Return current video status
    res.json({
      success: true,
      video: {
        id: video._id,
        status: video.status,
        progress: video.progress,
        generationType: video.generationType,
        prompt: video.prompt.original,
        video: video.video,
        thumbnail: video.thumbnail,
        creditCost: video.creditCost,
        creditDeducted: video.creditDeducted,
        error: video.error,
        timing: video.timing,
        template: video.templateId,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Video status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/videos/upload-photo
 * Upload user photo for template generation
 */
router.post('/upload-photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }

    console.log(`📸 Processing photo upload for user ${userId}`);

    // Upload to Cloudinary
    const cloudinaryResult = await uploadBase64Image(
      `data:${req.file.mimetype};base64,${(await fs.readFile(req.file.path)).toString('base64')}`,
      {
        folder: 'user-uploads',
        transformation: [
          { width: 1024, height: 1024, crop: 'limit' },
          { quality: 'auto', format: 'auto' }
        ]
      }
    );

    // Clean up local file
    await fs.unlink(req.file.path);

    console.log('✅ Photo uploaded successfully');

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      image: {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.public_id,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height
      }
    });

  } catch (error) {
    console.error('❌ Photo upload error:', error);

    // Clean up local file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('❌ Failed to cleanup temp file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: error.message
    });
  }
});

// ================= TEMPLATE ENDPOINTS =================

/**
 * GET /api/videos/templates
 * Get all video templates
 */
router.get('/templates', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      category,
      search,
      sort = 'popular',
      limit = 50,
      skip = 0,
      supportsPhoto
    } = req.query;

    console.log(`📋 Getting JSON templates for user ${userId} - Category: ${category}, Search: ${search}, Sort: ${sort}`);

    // Use JSON template service for predefined templates
    const result = await jsonTemplateService.getTemplates({
      category,
      search,
      sort,
      limit: parseInt(limit),
      skip: parseInt(skip),
      supportsPhoto: supportsPhoto === 'true' ? true : supportsPhoto === 'false' ? false : null
    });

    res.json({
      success: true,
      templates: result.templates,
      total: result.total,
      count: result.templates.length,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: result.hasMore,
        page: result.page,
        totalPages: result.totalPages
      }
    });

  } catch (error) {
    console.error('❌ Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message
    });
  }
});

/**
 * GET /api/videos/templates/:templateId
 * Get specific template details
 */
router.get('/templates/:templateId', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { templateId } = req.params;

    console.log(`📋 Getting template ${templateId} for user ${userId}`);

    // Use JSON template service for predefined templates
    const template = await jsonTemplateService.getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('❌ Get template error:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/videos/templates/category/:category
 * Get templates by category
 */
router.get('/templates/category/:category', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { category } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const templates = await templateService.getTemplatesByCategory(category, userId, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      category,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ Get templates by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates by category',
      error: error.message
    });
  }
});

/**
 * GET /api/videos/categories
 * Get all template categories with counts
 */
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`📂 Getting categories for user ${userId}`);

    // Use JSON template service for predefined categories
    const categories = await jsonTemplateService.getCategories();

    res.json({
      success: true,
      categories,
      count: categories.length
    });

  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
});

// ================= FAVORITES ENDPOINTS =================

/**
 * GET /api/videos/favorites
 * Get user's favorite templates
 */
router.get('/favorites', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, sort = 'recent' } = req.query;

    const favorites = await templateService.getUserFavorites(userId, {
      limit: parseInt(limit),
      sort
    });

    res.json({
      success: true,
      favorites,
      count: favorites.length
    });

  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get favorites',
      error: error.message
    });
  }
});

/**
 * POST /api/videos/favorites/:templateId
 * Add template to favorites
 */
router.post('/favorites/:templateId', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { templateId } = req.params;

    console.log(`❤️ Toggling favorite ${templateId} for user ${userId}`);

    // Use JSON template service for favorites (simulated)
    const result = await jsonTemplateService.toggleFavorite(templateId, userId);

    res.json({
      success: true,
      message: `Template ${result.isFavorite ? 'added to' : 'removed from'} favorites`,
      favorite: {
        templateId,
        isFavorite: result.isFavorite,
        action: result.isFavorite ? 'added to' : 'removed from'
      }
    });

  } catch (error) {
    console.error('❌ Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite',
      error: error.message
    });
  }
});

/**
 * GET /api/videos/recent
 * Get user's recent templates
 */
router.get('/recent', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 5 } = req.query;

    console.log(`⏰ Getting recent templates for user ${userId}`);

    // Use JSON template service for recent templates
    const recent = await jsonTemplateService.getRecentTemplates(parseInt(limit));

    res.json({
      success: true,
      recent,
      count: recent.length
    });

  } catch (error) {
    console.error('❌ Get recent templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent templates',
      error: error.message
    });
  }
});

// ================= USER VIDEO MANAGEMENT =================

/**
 * GET /api/videos/my-videos
 * Get user's generated videos
 */
router.get('/my-videos', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      status,
      limit = 20,
      skip = 0,
      sortBy = 'newest'
    } = req.query;

    console.log(`📹 Getting videos for user ${userId}`);

    const sort = sortBy === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const videos = await GeneratedVideo.getUserVideos(userId, {
      status,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sort
    });

    res.json({
      success: true,
      videos,
      count: videos.length,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: videos.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get user videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user videos',
      error: error.message
    });
  }
});

/**
 * DELETE /api/videos/:videoId
 * Delete user's generated video
 */
router.delete('/:videoId', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { videoId } = req.params;

    const video = await GeneratedVideo.findOne({
      _id: videoId,
      userId
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Delete from Cloudinary if exists
    if (video.video.publicId) {
      try {
        await videoProcessingService.deleteVideo(video.video.publicId);
      } catch (deleteError) {
        console.error('❌ Failed to delete video from Cloudinary:', deleteError);
        // Continue with database deletion
      }
    }

    // Delete thumbnail if exists
    if (video.thumbnail.publicId) {
      try {
        await videoProcessingService.deleteThumbnail(video.thumbnail.publicId);
      } catch (deleteError) {
        console.error('❌ Failed to delete thumbnail from Cloudinary:', deleteError);
      }
    }

    // Delete from database
    await GeneratedVideo.findByIdAndDelete(videoId);

    console.log(`✅ Video ${videoId} deleted successfully`);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
});

// ================= ADMIN ENDPOINTS =================

/**
 * GET /api/videos/admin/stats
 * Get video generation statistics (admin only)
 */
router.get('/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const templateStats = await templateService.getTemplateStats();

    const videoStats = await GeneratedVideo.aggregate([
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          completedVideos: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedVideos: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalCreditsUsed: {
            $sum: { $cond: ['$creditDeducted', '$creditCost', 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        templates: templateStats,
        videos: videoStats[0] || {
          totalVideos: 0,
          completedVideos: 0,
          failedVideos: 0,
          totalCreditsUsed: 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

module.exports = router;